import type { ConnectionMode, ConnectionType, InvoiceKind } from '@/lib/supabase/types'

export type SyncTransaction = {
  external_id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
}

export type SyncInvoice = {
  external_id: string
  client_name: string
  amount: number
  currency: string
  due_date: string
  invoice_kind: InvoiceKind
  status: 'pending' | 'paid'
}

export type DriverResult = {
  transactions: SyncTransaction[]
  invoices:     SyncInvoice[]
}

// Each driver speaks the same shape: receive credentials + last sync, return
// new normalized records. The orchestrator handles persistence + de-dup via
// (profile_id, source, external_id).
export type ConnectionDriver = {
  type: ConnectionType
  mode: ConnectionMode
  fetch: (input: {
    credentials: Record<string, string> | null
    metadata:    Record<string, unknown>
    sinceIso:    string | null
  }) => Promise<DriverResult>
}

export class DriverNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DriverNotConfiguredError'
  }
}
