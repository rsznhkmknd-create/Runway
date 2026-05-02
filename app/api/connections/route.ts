import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { encryptJson } from '@/lib/crypto'
import type { ConnectionType, ConnectionMode } from '@/lib/supabase/types'

const VALID_TYPES: ConnectionType[] = ['sii', 'fintoc', 'transbank']

// GET /api/connections — list all connections for the current user
export const GET = withRateLimit(async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!profile) return NextResponse.json({ connections: [] })

  const { data, error } = await supabase
    .from('connections')
    .select('id, type, status, mode, last_sync_at, last_error, records_imported, metadata, created_at')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connections: data ?? [] })
})

// POST /api/connections — create or replace a connection
//   body: { type, mode?, credentials?, metadata? }
//
//   credentials → object → encriptado AES-256-GCM antes de persistir
//   Para Fintoc en producción: enviar { link_token } devuelto por el widget.
//   En modo sandbox: credentials puede ser null.
export const POST = withRateLimit(async (req) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: {
    type?:        string
    mode?:        ConnectionMode
    credentials?: Record<string, string> | null
    metadata?:    Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!body.type || !VALID_TYPES.includes(body.type as ConnectionType)) {
    return NextResponse.json({ error: 'Tipo de conexión inválido' }, { status: 400 })
  }
  const type = body.type as ConnectionType
  const mode: ConnectionMode = body.mode === 'live' ? 'live' : 'sandbox'

  // Validación específica por tipo en modo live
  if (mode === 'live') {
    if (type === 'sii' && (!body.credentials?.rut || !body.credentials?.password)) {
      return NextResponse.json({ error: 'Faltan RUT y clave del SII' }, { status: 400 })
    }
    if (type === 'transbank' && (!body.credentials?.commerce_code || !body.credentials?.api_key)) {
      return NextResponse.json(
        { error: 'Faltan commerce_code y api_key de Transbank' },
        { status: 400 }
      )
    }
    if (type === 'fintoc' && !body.credentials?.link_token) {
      return NextResponse.json({ error: 'Falta link_token de Fintoc' }, { status: 400 })
    }
  }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const credentialsEncrypted =
    body.credentials && Object.keys(body.credentials).length > 0
      ? encryptJson(body.credentials)
      : null

  // Sólo guardamos en metadata datos NO sensibles. El RUT del SII se queda
  // aquí para mostrarlo en la UI; las claves van únicamente al campo cifrado.
  const safeMeta: Record<string, unknown> = { ...(body.metadata ?? {}) }
  if (type === 'sii' && body.credentials?.rut) safeMeta.rut = body.credentials.rut
  if (type === 'transbank' && body.credentials?.commerce_code) {
    safeMeta.commerce_code = body.credentials.commerce_code
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('connections') as any)
    .upsert(
      {
        profile_id:            profile.id,
        type,
        mode,
        status:                'active',
        credentials_encrypted: credentialsEncrypted,
        metadata:              safeMeta,
        last_error:            null,
      },
      { onConflict: 'profile_id,type' }
    )
    .select('id, type, status, mode, last_sync_at, last_error, records_imported, metadata, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'No se pudo guardar la conexión' },
      { status: 500 }
    )
  }

  return NextResponse.json({ connection: data })
})
