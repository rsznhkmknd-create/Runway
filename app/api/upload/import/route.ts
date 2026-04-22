import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { NormalizedTransaction } from '@/lib/normalize-transactions'

interface ImportBody {
  transactions: NormalizedTransaction[]
}

function isValidTransaction(t: unknown): t is NormalizedTransaction {
  if (!t || typeof t !== 'object') return false
  const o = t as Record<string, unknown>
  return (
    typeof o.amount === 'number' &&
    isFinite(o.amount) &&
    (o.type === 'income' || o.type === 'expense') &&
    typeof o.category === 'string' &&
    typeof o.description === 'string' &&
    typeof o.date === 'string'
  )
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: ImportBody
  try {
    body = (await req.json()) as ImportBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return NextResponse.json({ error: 'No se recibieron transacciones' }, { status: 400 })
  }

  const validTx = body.transactions.filter(isValidTransaction)
  if (validTx.length === 0) {
    return NextResponse.json({ error: 'Las transacciones no son válidas' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  let profileId: string | null = profile?.id ?? null

  if (!profileId) {
    // Auto-create profile if webhook hasn't fired yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newProfile, error: createError } = await (supabase.from('profiles') as any)
      .insert({ clerk_id: userId, email: `${userId}@pending.local`, currency: 'EUR' })
      .select('id')
      .single()

    if (createError || !newProfile) {
      return NextResponse.json(
        {
          error: 'No se pudo encontrar o crear el perfil de usuario',
          debug: { selectError: profileError, insertError: createError },
        },
        { status: 500 }
      )
    }
    profileId = (newProfile as { id: string }).id
  }

  const CHUNK = 500
  let inserted = 0

  for (let i = 0; i < validTx.length; i += CHUNK) {
    const chunk = validTx.slice(i, i + CHUNK).map((tx) => ({
      profile_id:  profileId!,
      amount:      tx.amount,
      type:        tx.type,
      category:    tx.category,
      description: tx.description,
      date:        tx.date,
    }))

    const { error } = await supabase.from('transactions').insert(chunk)
    if (error) {
      console.error('[import] Supabase insert error:', error)
      return NextResponse.json(
        { error: `Error al guardar las transacciones: ${error.message}` },
        { status: 500 }
      )
    }
    inserted += chunk.length
  }

  return NextResponse.json({ inserted, total: validTx.length })
}
