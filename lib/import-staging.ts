/**
 * Helpers for the two-phase import flow:
 *   1. /api/upload/analyze writes every detected row to import_staging.
 *   2. /api/import/[importId]/confirm moves staging rows with status='confirmed'
 *      into the live transactions table (or DELETE marks them 'rejected').
 *
 * Centralizing the bulk insert here keeps the auto-confirm path in analyze
 * and the explicit confirm path in /confirm using the same code (atomic
 * chunks of 500, the same field mapping, the same NormalizedTransaction
 * shape).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  NormalizedTransaction,
  NeedsReviewRow,
  ReceivableRow,
  LoanRow,
} from './normalize-transactions'
import type { Database, Json } from './supabase/types'

type SB = SupabaseClient<Database>

const CHUNK = 500

export type StagingInsertRow =
  Database['public']['Tables']['import_staging']['Insert']

/**
 * Build the array of staging rows from a normalize result. Each row carries
 * a status that downstream code uses to decide what happens at confirm time:
 *   - 'pending'     → confirm flow inserts it into transactions
 *   - 'needs_review'→ user must edit + approve (or discard) before confirm
 *
 * receivables/loans are stored with their own `type` and `status='pending'`
 * but the confirm flow treats them as banner-only data — they're NOT inserted
 * into transactions until those features ship.
 */
export function buildStagingRows(args: {
  importId: string
  profileId: string
  transactions: NormalizedTransaction[]
  needsReview: NeedsReviewRow[]
  receivables: ReceivableRow[]
  loans: LoanRow[]
}): StagingInsertRow[] {
  const { importId, profileId, transactions, needsReview, receivables, loans } = args
  const out: StagingInsertRow[] = []

  for (const t of transactions) {
    out.push({
      import_id: importId,
      profile_id: profileId,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.date,
      status: 'pending',
      raw_row: t as unknown as Json,
    })
  }

  for (const r of needsReview) {
    out.push({
      import_id: importId,
      profile_id: profileId,
      amount: r.suggestedPatch?.amount ?? null,
      type: r.suggestedPatch?.type ?? 'expense',
      category: r.suggestedPatch?.category ?? 'Sin categoría',
      description: r.suggestedPatch?.description ?? null,
      date: r.suggestedPatch?.date ?? null,
      status: 'needs_review',
      review_flags: { reason: r.reason } as unknown as Json,
      raw_row: r.rawRow as unknown as Json,
      region_id: r.regionId ?? null,
      block_type: r.blockType ?? null,
    })
  }

  for (const recv of receivables) {
    out.push({
      import_id: importId,
      profile_id: profileId,
      amount: recv.amount,
      type: 'receivable',
      category: 'Cuentas por cobrar',
      description: null,
      date: null,
      status: 'pending',
      raw_row: recv.raw as unknown as Json,
      region_id: recv.regionId ?? null,
      block_type: 'accounts_receivable',
    })
  }

  for (const loan of loans) {
    out.push({
      import_id: importId,
      profile_id: profileId,
      amount: loan.originalAmount,
      type: 'loan',
      category: 'Préstamos',
      description: null,
      date: null,
      status: 'pending',
      raw_row: loan.raw as unknown as Json,
      region_id: loan.regionId ?? null,
      block_type: 'loans_payable',
    })
  }

  return out
}

/** Bulk-insert staging rows in chunks of 500. Throws on the first error. */
export async function insertStagingChunked(
  supabase: SB,
  rows: StagingInsertRow[]
): Promise<{ inserted: number }> {
  if (rows.length === 0) return { inserted: 0 }
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('import_staging') as any).insert(slice)
    if (error) throw new Error(`Supabase staging insert: ${error.message}`)
    inserted += slice.length
  }
  return { inserted }
}

/**
 * Move every staging row in the given import that has status `from` to
 * `transactions`, then mark those staging rows as 'confirmed'. Skips rows
 * with type in ('receivable','loan') — those features aren't built yet.
 *
 * Used by both:
 *   - /api/upload/analyze auto-confirm (when analysis is high-confidence)
 *   - /api/import/[importId]/confirm
 */
export async function commitStagingToTransactions(
  supabase: SB,
  importId: string,
  profileId: string,
  fromStatuses: Array<'pending' | 'needs_review' | 'confirmed'> = ['pending']
): Promise<{ inserted: number }> {
  // Pull the rows we need to commit.
  const { data: stagedRaw, error: selectErr } = await supabase
    .from('import_staging')
    .select('id, amount, type, category, description, date')
    .eq('import_id', importId)
    .eq('profile_id', profileId)
    .in('status', fromStatuses)

  if (selectErr) throw new Error(`Supabase staging select: ${selectErr.message}`)

  type StagingForCommit = {
    id: string
    amount: number | null
    type: string | null
    category: string | null
    description: string | null
    date: string | null
  }
  const staged = (stagedRaw ?? []) as StagingForCommit[]

  // Filter the ones that are ready to become transactions.
  const insertable = staged.filter(
    (r) =>
      (r.type === 'income' || r.type === 'expense') &&
      typeof r.amount === 'number' &&
      Number.isFinite(r.amount) &&
      typeof r.category === 'string' &&
      r.category.length > 0 &&
      typeof r.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.date)
  )

  if (insertable.length === 0) {
    // Still mark non-insertables as confirmed so the staging table reflects
    // the final state (receivables/loans don't go to transactions but the
    // user "confirmed" them as part of the import).
    await markStagingStatus(supabase, importId, profileId, fromStatuses, 'confirmed')
    return { inserted: 0 }
  }

  // Bulk insert into transactions in chunks.
  let inserted = 0
  for (let i = 0; i < insertable.length; i += CHUNK) {
    const chunk = insertable.slice(i, i + CHUNK).map((r) => ({
      profile_id: profileId,
      amount: r.amount as number,
      type: r.type as 'income' | 'expense',
      category: r.category as string,
      description: r.description ?? null,
      date: r.date as string,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('transactions') as any).insert(chunk)
    if (error) throw new Error(`Supabase transactions insert: ${error.message}`)
    inserted += chunk.length
  }

  // Mark every staging row as confirmed (including the receivables/loans we
  // didn't insert — they exist for audit + future receivables/loans backend).
  await markStagingStatus(supabase, importId, profileId, fromStatuses, 'confirmed')

  return { inserted }
}

/** Bulk status update for an import — used by confirm AND delete. */
export async function markStagingStatus(
  supabase: SB,
  importId: string,
  profileId: string,
  fromStatuses: Array<'pending' | 'needs_review' | 'confirmed' | 'rejected'>,
  toStatus: 'pending' | 'needs_review' | 'confirmed' | 'rejected'
): Promise<{ updated: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('import_staging') as any)
    .update({ status: toStatus })
    .eq('import_id', importId)
    .eq('profile_id', profileId)
    .in('status', fromStatuses)
    .select('id')

  if (error) throw new Error(`Supabase staging update: ${error.message}`)
  return { updated: (data ?? []).length }
}
