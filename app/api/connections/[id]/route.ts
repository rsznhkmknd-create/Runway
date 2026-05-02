import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'

// DELETE /api/connections/:id — desconectar (soft: status = disconnected,
// borra credenciales). No borra los datos ya importados — el usuario
// los puede gestionar desde Movimientos / Facturas.
export const DELETE = withRateLimit(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('connections') as any)
      .update({
        status:                'disconnected',
        credentials_encrypted: null,
        last_error:            null,
      })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
)
