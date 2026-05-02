import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { syncConnection } from '@/lib/connections/sync'

// POST /api/connections/:id/sync — sincronización manual de una conexión.
export const POST = withRateLimit(
  async (_req, { params }: { params: { id: string } }) => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: connection } = await supabase
      .from('connections')
      .select('id, profile_id, profiles!inner(clerk_id)')
      .eq('id', params.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerClerkId = (connection as any)?.profiles?.clerk_id
    if (!connection || ownerClerkId !== userId) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 })
    }

    try {
      const outcome = await syncConnection(supabase, params.id, 'manual')
      return NextResponse.json({ outcome })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Error en la sincronización' },
        { status: 500 }
      )
    }
  }
)
