import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { incrementUsage } from '@/lib/usage'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'
import { ImportBodySchema, formatZodIssues } from '@/lib/schemas/import'

export const POST = withRateLimit(async (req) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // ── Parse + validate request body via zod ──────────────────────────────────
  let bodyJson: unknown
  try {
    bodyJson = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const parsed = ImportBodySchema.safeParse(bodyJson)
  if (!parsed.success) {
    const issues = formatZodIssues(parsed.error)
    console.error('[import] schema validation failed:', issues)
    return NextResponse.json(
      {
        error: 'Las transacciones recibidas no son válidas',
        issues,
      },
      { status: 400 }
    )
  }

  const { transactions, needsReviewApproved } = parsed.data

  // Merge approved-after-review rows into the bulk insert.
  const merged = [...transactions, ...(needsReviewApproved ?? [])]

  if (merged.length === 0) {
    return NextResponse.json({ error: 'No se recibieron transacciones' }, { status: 400 })
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

  for (let i = 0; i < merged.length; i += CHUNK) {
    const chunk = merged.slice(i, i + CHUNK).map((tx) => ({
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

  // Contabilizar la operación de import (una por POST, no por transacción).
  void incrementUsage(profileId, 'imports_count')

  return NextResponse.json({
    inserted,
    total: merged.length,
    fromReview: needsReviewApproved?.length ?? 0,
  })
}, aiLimiter)
