import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Plug } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { ALL_CONNECTION_TYPES, CONNECTION_META } from '@/lib/connections/registry'
import type { ConnectionType } from '@/lib/supabase/types'
import ConnectionsList, { type ConnectionRow } from '@/components/connections/ConnectionsList'
import SandboxBanner from '@/components/connections/SandboxBanner'

export const metadata: Metadata = { title: 'Conexiones' }

export default async function ConexionesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  let existing: ConnectionRow[] = []
  if (profile) {
    const { data } = await supabase
      .from('connections')
      .select('id, type, status, mode, last_sync_at, last_error, records_imported, metadata')
      .eq('profile_id', profile.id)
    existing = (data ?? []) as unknown as ConnectionRow[]
  }

  // Build a uniform list: one entry per supported integration, with the
  // user's connection if it exists.
  const initial = ALL_CONNECTION_TYPES.map<ConnectionRow>((type) => {
    const found = existing.find((c) => c.type === type)
    return (
      found ?? {
        id:               null,
        type,
        status:           'disconnected',
        mode:             'sandbox',
        last_sync_at:     null,
        last_error:       null,
        records_imported: 0,
        metadata:         {},
      }
    )
  })

  const anySandbox = initial.some((c) => c.id !== null && c.mode === 'sandbox')

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
          <Plug className="w-5 h-5 text-mint" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Conexiones automáticas</h1>
          <p className="text-text-muted mt-1 text-sm">
            Conecta el SII, tu banco y Transbank para que tus facturas y movimientos
            entren a Finsight sin tocar Excel.
          </p>
        </div>
      </div>

      {anySandbox && <SandboxBanner />}

      <ConnectionsList
        initial={initial}
        meta={ALL_CONNECTION_TYPES.reduce(
          (acc, t) => ({ ...acc, [t]: CONNECTION_META[t] }),
          {} as Record<ConnectionType, typeof CONNECTION_META[ConnectionType]>
        )}
      />
    </div>
  )
}
