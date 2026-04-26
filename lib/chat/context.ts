/**
 * Build the live financial context that gets injected into Claude's system
 * prompt for each /api/chat call. Pulls fresh data from Supabase scoped to
 * the authenticated profile_id and summarizes it down to ~1-2K tokens so
 * we can keep cost per chat call sane (~$0.01-0.02).
 *
 * NEVER returns raw row dumps — every field is aggregated or summarized.
 * If we ever need detail, Claude can call a tool to fetch it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'

type SB = SupabaseClient<Database>

type Tx = {
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string | null
  date: string
}

type Inv = {
  id: string
  client_name: string
  amount: number
  currency: string
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
}

export type ChatContext = {
  companyName: string
  currency: string
  cashBalance: number
  /** Months until cash runs out at the trailing 3-month average burn. */
  runwayMonths: number | null
  monthlyBurn: number
  thisMonthIncome: number
  thisMonthExpense: number
  topExpenseCategoriesThisMonth: Array<{ category: string; amount: number }>
  pendingInvoicesCount: number
  pendingInvoicesTotal: number
  overdueInvoicesCount: number
  overdueInvoicesTotal: number
  recentInvoices: Array<{
    id: string
    client: string
    amount: number
    currency: string
    dueDate: string
    status: 'pending' | 'paid' | 'overdue'
  }>
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

export async function buildChatContext(
  supabase: SB,
  profileId: string,
  companyName: string | null | undefined,
  currency: string
): Promise<ChatContext> {
  const [txRes, invRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type, category, description, date')
      .eq('profile_id', profileId)
      .order('date', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, client_name, amount, currency, due_date, status')
      .eq('profile_id', profileId)
      .order('due_date', { ascending: true }),
  ])

  const txs = ((txRes.data ?? []) as Tx[]).filter((t) => Number.isFinite(t.amount))
  const invs = (invRes.data ?? []) as Inv[]

  // ── Cash + monthly buckets ────────────────────────────────────────────
  const now = new Date()
  const monthStart = startOfMonth(now)
  const threeMonthsAgo = monthsAgo(3)

  let cashBalance = 0
  let thisMonthIncome = 0
  let thisMonthExpense = 0
  let last3Expense = 0
  const monthCategoryTotals: Record<string, number> = {}

  for (const t of txs) {
    const d = new Date(t.date)
    if (Number.isNaN(d.getTime())) continue
    const amt = Math.abs(t.amount)

    if (t.type === 'income') cashBalance += amt
    else cashBalance -= amt

    if (d >= monthStart) {
      if (t.type === 'income') thisMonthIncome += amt
      else {
        thisMonthExpense += amt
        monthCategoryTotals[t.category] = (monthCategoryTotals[t.category] ?? 0) + amt
      }
    }

    if (t.type === 'expense' && d >= threeMonthsAgo) last3Expense += amt
  }

  const monthlyBurn = last3Expense / 3
  const runwayMonths =
    monthlyBurn > 0 && cashBalance > 0
      ? Math.round((cashBalance / monthlyBurn) * 10) / 10
      : null

  const topExpenseCategoriesThisMonth = Object.entries(monthCategoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))

  // ── Invoices ───────────────────────────────────────────────────────────
  const pending = invs.filter((i) => i.status === 'pending')
  const overdue = invs.filter((i) => i.status === 'overdue')
  const sumAmt = (arr: Inv[]) => arr.reduce((s, i) => s + Math.abs(i.amount), 0)

  const recentInvoices = invs.slice(0, 10).map((i) => ({
    id: i.id,
    client: i.client_name,
    amount: i.amount,
    currency: i.currency,
    dueDate: i.due_date,
    status: i.status,
  }))

  return {
    companyName: (companyName ?? '').trim() || 'tu empresa',
    currency,
    cashBalance: Math.round(Math.max(cashBalance, 0)),
    runwayMonths,
    monthlyBurn: Math.round(monthlyBurn),
    thisMonthIncome: Math.round(thisMonthIncome),
    thisMonthExpense: Math.round(thisMonthExpense),
    topExpenseCategoriesThisMonth,
    pendingInvoicesCount: pending.length,
    pendingInvoicesTotal: Math.round(sumAmt(pending)),
    overdueInvoicesCount: overdue.length,
    overdueInvoicesTotal: Math.round(sumAmt(overdue)),
    recentInvoices,
  }
}

function formatCurrency(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n} ${currency}`
  }
}

/**
 * Render the context as a Spanish summary block that gets appended to the
 * system prompt. ~250-500 tokens depending on how much data the user has.
 */
export function renderContextForPrompt(ctx: ChatContext): string {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push(`Datos financieros actuales (al ${today}):`)
  lines.push(`- Empresa: ${ctx.companyName}`)
  lines.push(`- Moneda: ${ctx.currency}`)
  lines.push(`- Saldo en caja: ${formatCurrency(ctx.cashBalance, ctx.currency)}`)
  lines.push(
    `- Burn rate (promedio últimos 3 meses): ${formatCurrency(ctx.monthlyBurn, ctx.currency)}/mes`
  )
  if (ctx.runwayMonths != null) {
    lines.push(`- Runway: ${ctx.runwayMonths} meses`)
  } else {
    lines.push(`- Runway: no calculable (sin gastos o sin caja positiva)`)
  }
  lines.push(
    `- Este mes: ingresos ${formatCurrency(ctx.thisMonthIncome, ctx.currency)} · ` +
      `gastos ${formatCurrency(ctx.thisMonthExpense, ctx.currency)}`
  )
  if (ctx.topExpenseCategoriesThisMonth.length > 0) {
    lines.push(`- Top categorías de gasto este mes:`)
    for (const c of ctx.topExpenseCategoriesThisMonth) {
      lines.push(`    · ${c.category}: ${formatCurrency(c.amount, ctx.currency)}`)
    }
  }
  lines.push(
    `- Facturas pendientes: ${ctx.pendingInvoicesCount} ` +
      `(${formatCurrency(ctx.pendingInvoicesTotal, ctx.currency)})`
  )
  if (ctx.overdueInvoicesCount > 0) {
    lines.push(
      `- Facturas vencidas: ${ctx.overdueInvoicesCount} ` +
        `(${formatCurrency(ctx.overdueInvoicesTotal, ctx.currency)})`
    )
  }
  if (ctx.recentInvoices.length > 0) {
    lines.push(`- Facturas recientes (id · cliente · importe · vence · estado):`)
    for (const i of ctx.recentInvoices.slice(0, 8)) {
      lines.push(
        `    · ${i.id.slice(0, 8)} · ${i.client} · ${formatCurrency(i.amount, i.currency)} · ${i.dueDate} · ${i.status}`
      )
    }
  }
  return lines.join('\n')
}
