import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

// Bucket per kind. Both are public (see schema.sql).
const BUCKETS = {
  logo:   'company-logos',
  avatar: 'avatars',
} as const

type UploadKind = keyof typeof BUCKETS

function extensionFor(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    'image/png':     'png',
    'image/jpeg':    'jpg',
    'image/webp':    'webp',
    'image/gif':     'gif',
    'image/svg+xml': 'svg',
  }
  return map[mime] ?? fallback
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const kindRaw = (formData.get('kind') as string | null) ?? ''
  const kind = (kindRaw === 'logo' || kindRaw === 'avatar') ? (kindRaw as UploadKind) : null

  if (!file)  return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  if (!kind)  return NextResponse.json({ error: 'Tipo de imagen inválido (logo | avatar)' }, { status: 400 })

  if (file.size === 0) {
    return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'La imagen supera el límite de 5 MB' }, { status: 400 })
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME.includes(mime)) {
    return NextResponse.json(
      { error: 'Formato no soportado. Usa PNG, JPG, WEBP, GIF o SVG.' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Look up the profile so we know what column to update
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json(
      { error: profileErr?.message ?? 'Perfil no encontrado' },
      { status: 404 }
    )
  }

  const ext = extensionFor(mime, file.name.split('.').pop() ?? 'png')
  // Use clerk_id in the path so paths are stable per user and old images can be
  // overwritten rather than accumulating forever.
  const objectPath = `${userId}/${kind}-${Date.now()}.${ext}`
  const bucket = BUCKETS[kind]

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType: mime,
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadErr) {
    console.error('[profile/upload] storage error:', uploadErr)
    return NextResponse.json(
      {
        error:
          `No se pudo subir la imagen: ${uploadErr.message}. Asegúrate de que el bucket "${bucket}" exista y sea público.`,
      },
      { status: 500 }
    )
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath)
  const url = publicData.publicUrl

  // Persist the URL on the profile
  const column = kind === 'logo' ? 'logo_url' : 'avatar_url'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {
    [column]: url,
    updated_at: new Date().toISOString(),
  }
  const { error: updateErr } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('clerk_id', userId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ url, kind })
}
