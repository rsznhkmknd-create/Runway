import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeTransactions } from '@/lib/normalize-transactions'
import type { ColumnMapping } from '@/lib/normalize-transactions'
import type { ParsedRow } from '@/lib/parse-file'

interface ImportBody {
  mapping: ColumnMapping
  rows: ParsedRow[]
}

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: ImportBody
  try {
    body = (await req.json()) as ImportBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!body.mapping || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Look up user profile in Supabase
  const supabase = createServiceClient()

  console.log('[import] userId:', userId)
  console.log('[import] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[import] SERVICE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('[import] SERVICE_KEY prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20))

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  console.log('[import] SELECT profile → data:', profile, '| error:', JSON.stringify(profileError))

  if (profileError || !profile) {
    // If no profile exists, auto-create one (for users who skipped webhook setup)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newProfile, error: createError } = await (supabase.from('profiles') as any)
      .insert({ clerk_id: userId, email: `${userId}@pending.local`, currency: 'EUR' })
      .select('id')
      .single()

    console.log('[import] INSERT profile → data:', newProfile, '| error:', JSON.stringify(createError))

    if (createError || !newProfile) {
      return NextResponse.json(
        {
          error: 'No se pudo encontrar o crear el perfil de usuario',
          debug: {
            selectError: profileError,
            insertError: createError,
            userId,
          },
        },
        { status: 500 }
      )
    }

    return await insertTransactions(supabase, (newProfile as { id: string }).id, body)
  }

  return await insertTransactions(supabase, (profile as { id: string }).id, body)
}

async function insertTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  body: ImportBody
): Promise<NextResponse> {
  const normalized = normalizeTransactions(body.rows, body.mapping)

  if (normalized.length === 0) {
    return NextResponse.json(
      { error: 'No se encontraron transacciones válidas en el archivo' },
      { status: 422 }
    )
  }

  // Batch-insert in chunks of 500 to avoid request size limits
  const CHUNK = 500
  let inserted = 0

  for (let i = 0; i < normalized.length; i += CHUNK) {
    const chunk = normalized.slice(i, i + CHUNK).map((tx) => ({
      profile_id: profileId,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      date: tx.date,
    }))

    const { error } = await supabase.from('transactions').insert(chunk)

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: `Error al guardar las transacciones: ${error.message}` },
        { status: 500 }
      )
    }

    inserted += chunk.length
  }

  return NextResponse.json({ inserted, total: normalized.length })
}
