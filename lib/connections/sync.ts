import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ConnectionType, SyncTrigger } from '@/lib/supabase/types'
import { decryptJson } from '@/lib/crypto'
import { getDriver } from './registry'
import { reconcileInvoicesAgainstBank } from './reconcile'

type Supa = SupabaseClient<Database>

export type SyncOutcome = {
  connectionId:    string
  type:            ConnectionType
  status:          'success' | 'partial' | 'error'
  recordsImported: number
  reconciled:      number
  durationMs:      number
  error?:          string
}

// Sync a single connection: fetch from driver, upsert with idempotency,
// run reconciliation if the type warrants it, and append a sync_logs row.
export async function syncConnection(
  supabase: Supa,
  connectionId: string,
  trigger: SyncTrigger = 'manual'
): Promise<SyncOutcome> {
  const start = Date.now()

  const { data: connection, error: connErr } = await supabase
    .from('connections')
    .select(
      'id, profile_id, type, mode, credentials_encrypted, metadata, last_sync_at, records_imported'
    )
    .eq('id', connectionId)
    .single()

  if (connErr || !connection) {
    throw new Error(`Conexión no encontrada: ${connErr?.message ?? connectionId}`)
  }

  const driver = getDriver(connection.type, connection.mode)

  let credentials: Record<string, string> | null = null
  if (connection.credentials_encrypted) {
    try {
      credentials = decryptJson<Record<string, string>>(connection.credentials_encrypted)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo descifrar las credenciales'
      await failConnection(supabase, connection.id, connection.profile_id, trigger, start, msg)
      return {
        connectionId: connection.id,
        type:         connection.type,
        status:       'error',
        recordsImported: 0,
        reconciled:   0,
        durationMs:   Date.now() - start,
        error:        msg,
      }
    }
  }

  let imported  = 0
  let reconciled = 0
  let status: 'success' | 'partial' | 'error' = 'success'
  let error: string | undefined

  try {
    const result = await driver.fetch({
      credentials,
      metadata: (connection.metadata ?? {}) as Record<string, unknown>,
      sinceIso: connection.last_sync_at,
    })

    if (result.transactions.length > 0) {
      const rows = result.transactions.map((t) => ({
        profile_id:    connection.profile_id,
        amount:        t.amount,
        type:          t.type,
        category:      t.category,
        description:   t.description,
        date:          t.date,
        source:        connection.type,
        external_id:   t.external_id,
        connection_id: connection.id,
      }))
      // Idempotent: (profile_id, source, external_id) is UNIQUE so re-syncing
      // the same record is a no-op.
      const { error: upErr } = await supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'profile_id,source,external_id', ignoreDuplicates: true })
      if (upErr) throw new Error(`No se pudieron guardar las transacciones: ${upErr.message}`)
      imported += rows.length
    }

    if (result.invoices.length > 0) {
      const rows = result.invoices.map((i) => ({
        profile_id:    connection.profile_id,
        client_name:   i.client_name,
        amount:        i.amount,
        currency:      i.currency,
        due_date:      i.due_date,
        status:        i.status,
        source:        connection.type,
        external_id:   i.external_id,
        connection_id: connection.id,
        invoice_kind:  i.invoice_kind,
      }))
      const { error: upErr } = await supabase
        .from('invoices')
        .upsert(rows, { onConflict: 'profile_id,source,external_id', ignoreDuplicates: true })
      if (upErr) throw new Error(`No se pudieron guardar las facturas: ${upErr.message}`)
      imported += rows.length
    }

    // Conciliación: cuando entra info nueva del SII o del banco, intentamos
    // emparejar facturas pendientes con movimientos bancarios.
    if (connection.type === 'sii' || connection.type === 'fintoc') {
      reconciled = await reconcileInvoicesAgainstBank(supabase, connection.profile_id)
    }
  } catch (e) {
    status = 'error'
    error = e instanceof Error ? e.message : String(e)
  }

  const durationMs = Date.now() - start

  // Update connection state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('connections') as any)
    .update({
      last_sync_at:     new Date().toISOString(),
      last_error:       status === 'error' ? error ?? null : null,
      status:           status === 'error' ? 'error' : 'active',
      records_imported: (connection.records_imported ?? 0) + imported,
    } as Database['public']['Tables']['connections']['Update'] & { records_imported: number })
    .eq('id', connection.id)

  // sync_logs row (append-only)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('sync_logs') as any).insert({
    connection_id:    connection.id,
    profile_id:       connection.profile_id,
    records_imported: imported,
    reconciled_count: reconciled,
    status,
    error:            error ?? null,
    duration_ms:      durationMs,
    trigger,
  })

  return {
    connectionId: connection.id,
    type:         connection.type,
    status,
    recordsImported: imported,
    reconciled,
    durationMs,
    error,
  }
}

async function failConnection(
  supabase: Supa,
  connectionId: string,
  profileId: string,
  trigger: SyncTrigger,
  start: number,
  message: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('connections') as any)
    .update({ status: 'error', last_error: message, last_sync_at: new Date().toISOString() })
    .eq('id', connectionId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('sync_logs') as any).insert({
    connection_id:    connectionId,
    profile_id:       profileId,
    records_imported: 0,
    reconciled_count: 0,
    status:           'error',
    error:            message,
    duration_ms:      Date.now() - start,
    trigger,
  })
}

// Sync every active connection for a single user. Used by the manual
// "Sincronizar todo" button and by the cron job per-user.
export async function syncAllForProfile(
  supabase: Supa,
  profileId: string,
  trigger: SyncTrigger = 'manual'
): Promise<SyncOutcome[]> {
  const { data: connections } = await supabase
    .from('connections')
    .select('id')
    .eq('profile_id', profileId)
    .in('status', ['active', 'error'])

  if (!connections || connections.length === 0) return []

  const outcomes: SyncOutcome[] = []
  for (const c of connections) {
    try {
      outcomes.push(await syncConnection(supabase, c.id, trigger))
    } catch (e) {
      outcomes.push({
        connectionId: c.id,
        type:         'sii', // unknown — best-effort
        status:       'error',
        recordsImported: 0,
        reconciled:   0,
        durationMs:   0,
        error:        e instanceof Error ? e.message : String(e),
      })
    }
  }
  return outcomes
}
