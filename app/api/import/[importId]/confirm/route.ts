import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'
import {
  commitStagingToTransactions,
  markStagingStatus,
} from '@/lib/import-staging'
import { incrementUsage } from '@/lib/usage'

// ── Body schema ─────────────────────────────────────────────────────────────
//
// `approvedReviewIds` are staging row ids that the user reviewed and wants to
// keep. `edits` are per-row patches the user made in the UI before approving.
// Anything not in `approvedReviewIds` stays in 'needs_review' until the user
// either approves it later or DELETEs the import.
const PatchSchema = z.object({
  amount: z.number().nullable().optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

const BodySchema = z.object({
  approvedReviewIds: z.array(z.string().uuid()).default([]),
  edits: z
    .array(
      z.object({
        id: z.string().uuid(),
        patch: PatchSchema,
      })
    )
    .default([]),
})

export const POST = withRateLimit(
  async (req: Request, ctx: { params: { importId: string } }) => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const importId = ctx.params.importId
    if (!/^[0-9a-f-]{36}$/i.test(importId)) {
      return NextResponse.json({ error: 'importId inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body inválido', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Ownership check via profile_id.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single()
    if (!profile?.id) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    const profileId = profile.id

    // Verify the import exists for this profile.
    const { data: any_row } = await supabase
      .from('import_staging')
      .select('id')
      .eq('import_id', importId)
      .eq('profile_id', profileId)
      .limit(1)
      .maybeSingle()
    if (!any_row) {
      return NextResponse.json({ error: 'Import no encontrado' }, { status: 404 })
    }

    // 1. Apply per-row edits to staging rows.
    for (const e of parsed.data.edits) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('import_staging') as any)
        .update(e.patch)
        .eq('id', e.id)
        .eq('profile_id', profileId)
        .eq('import_id', importId)
      if (error) {
        console.error('[import:confirm] edit failed:', error.message)
        return NextResponse.json(
          { error: `No se pudo aplicar la edición ${e.id}: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // 2. Promote approved needs_review rows to 'pending'.
    if (parsed.data.approvedReviewIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('import_staging') as any)
        .update({ status: 'pending' })
        .in('id', parsed.data.approvedReviewIds)
        .eq('profile_id', profileId)
        .eq('import_id', importId)
        .eq('status', 'needs_review')
      if (error) {
        console.error('[import:confirm] approve update failed:', error.message)
        return NextResponse.json(
          { error: `Falló la aprobación de las filas en revisión: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // 3. Reject anything still in needs_review (the user didn't approve it).
    await markStagingStatus(supabase, importId, profileId, ['needs_review'], 'rejected')

    // 4. Commit pending rows to transactions.
    let inserted = 0
    let total = 0
    try {
      const res = await commitStagingToTransactions(supabase, importId, profileId, ['pending'])
      inserted = res.inserted
      total = inserted
    } catch (err) {
      console.error('[import:confirm] commit failed:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Error al confirmar' },
        { status: 500 }
      )
    }

    void incrementUsage(profileId, 'imports_count')

    return NextResponse.json({ inserted, total, importId })
  },
  aiLimiter
)
