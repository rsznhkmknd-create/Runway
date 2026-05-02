import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Plug, AlertCircle } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { ALL_CONNECTION_TYPES, CONNECTION_META } from '@/lib/connections/meta'
import ConnectionsList, { type ConnectionRow } from '@/components/connections/ConnectionsList'
import SandboxBanner from '@/components/connections/SandboxBanner'

export const metadata: Metadata = { title: 'Conexiones' }
export const dynamic = 'force-dynamic'

export default async function ConexionesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  // Defensive: if the connections table hasn't been migrated yet, show an
  // explicit warning instead of letting the page error silently. The page
  // still renders the 3 cards in their disconnected state below.
  let existing: ConnectionRow[] = []
  let migrationMissing = false
  if (profile) {
    const { data, error } = await supabase
      .from('connections')
      .select('id, type, status, mode, last_sync_at, last_error, records_imported, metadata')
      .eq('profile_id', profile.id)

    if (error) {
      // Postgres "relation does not exist" → migration 007 not applied.
      // We log and continue with empty state so the user still sees the UI.
      console.error('[conexiones] supabase error:', error)
      migrationMissing = /relation .* does not exist|does not exist|schema cache/i.test(
        error.message
      )
    } else {
      existing = (data ?? []) as unknown as ConnectionRow[]
    }
  }

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

      {migrationMissing && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 space-y-1">
            <p className="font-semibold">Falta ejecutar la migración 007</p>
            <p className="text-red-600">
              Las tablas <code>connections</code> y <code>sync_logs</code> no existen
              en Supabase. Ejecuta{' '}
              <code className="font-mono">supabase/migrations/007_connections_and_sync_logs.sql</code>{' '}
              en el SQL Editor para activar esta página.
            </p>
          </div>
        </div>
      )}

      {anySandbox && <SandboxBanner />}

      <ConnectionsList initial={initial} meta={CONNECTION_META} />
    </div>
  )
}
