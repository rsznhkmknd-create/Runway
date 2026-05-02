import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Supa = SupabaseClient<Database>

const MATCH_WINDOW_DAYS = 3
const AMOUNT_TOLERANCE  = 0.01  // CLP es entero, dejamos 1 centavo de holgura.

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.floor(ms / 86_400_000)
}

// Empareja facturas pendientes del SII con movimientos bancarios entrantes
// del Fintoc usando ventana de fechas + monto. Marca la factura como `paid`
// y guarda el id de la transacción en matched_transaction_id.
//
// Devuelve cuántas facturas se conciliaron en esta corrida.
export async function reconcileInvoicesAgainstBank(
  supabase: Supa,
  profileId: string
): Promise<number> {
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, amount, due_date, invoice_kind, status, source')
    .eq('profile_id', profileId)
    .eq('status', 'pending')
    .eq('source', 'sii')

  if (invErr || !invoices || invoices.length === 0) return 0

  const { data: txs, error: txErr } = await supabase
    .from('transactions')
    .select('id, amount, type, date, source')
    .eq('profile_id', profileId)
    .eq('source', 'fintoc')

  if (txErr || !txs || txs.length === 0) return 0

  const usedTxIds = new Set<string>()
  let matched = 0

  for (const inv of invoices) {
    // Issued invoices = expect income; received invoices = expect expense.
    const expectedType: 'income' | 'expense' =
      inv.invoice_kind === 'received' ? 'expense' : 'income'

    const candidate = txs.find((t) => {
      if (usedTxIds.has(t.id))                          return false
      if (t.type !== expectedType)                      return false
      if (Math.abs(t.amount - inv.amount) > AMOUNT_TOLERANCE) return false
      if (daysBetween(t.date, inv.due_date) > MATCH_WINDOW_DAYS) return false
      return true
    })

    if (!candidate) continue

    usedTxIds.add(candidate.id)

    const { error: updErr } = await supabase
      .from('invoices')
      .update({
        status:                 'paid',
        paid_at:                new Date(candidate.date).toISOString(),
        matched_transaction_id: candidate.id,
      })
      .eq('id', inv.id)

    if (!updErr) matched += 1
  }

  return matched
}
