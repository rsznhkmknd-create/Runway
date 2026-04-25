import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'
import { markStagingStatus } from '@/lib/import-staging'

/**
 * DELETE /api/import/:importId
 * Marks every staging row in the import as 'rejected' (does NOT delete rows
 * — auditing intent). Used when the user dismisses the review screen.
 */
export const DELETE = withRateLimit(
  async (_req: Request, ctx: { params: { importId: string } }) => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const importId = ctx.params.importId
    if (!/^[0-9a-f-]{36}$/i.test(importId)) {
      return NextResponse.json({ error: 'importId inválido' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single()
    if (!profile?.id) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    try {
      const { updated } = await markStagingStatus(
        supabase,
        importId,
        profile.id,
        ['pending', 'needs_review', 'confirmed'],
        'rejected'
      )
      return NextResponse.json({ rejected: updated, importId })
    } catch (err) {
      console.error('[import:delete] failed:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Error al cancelar' },
        { status: 500 }
      )
    }
  },
  aiLimiter
)
