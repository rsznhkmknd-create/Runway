import { safeNumber, isValidDate, todayIso } from '@/lib/safe'
import type { Alert } from './types'

type Transaction = {
  amount: number | string
  type:   'income' | 'expense'
  date:   string
  category: string
}

type Invoice = {
  amount:   number | string
  currency: string
  due_date: string
  status:   'pending' | 'paid' | 'overdue'
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthsAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() - n)
  return d
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount).toLocaleString('es-ES')} ${currency}`
  }
}

/**
 * Compute all active alerts for a user from their current transactions + invoices.
 * Pure function — no DB or network access. Caller supplies the data.
 *
 * The three alert types and their IDs:
 *   - `runway-critical`   — runway < 3 months
 *   - `invoices-overdue`  — 1+ invoice marked overdue OR pending past due_date
 *   - `expenses-surge`    — current-month expenses > 120% of previous month
 */
export function computeAlerts(
  transactions: Transaction[],
  invoices: Invoice[],
  currency: string = 'EUR'
): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()
  const today = todayIso()
  const computed_at = today

  // ── Normalize inputs ────────────────────────────────────────────────────
  const safeTx = transactions
    .filter((t) => isValidDate(t.date))
    .map((t) => ({
      amount: safeNumber(t.amount),
      type:   t.type,
      date:   t.date,
      category: t.category,
    }))

  const safeInvoices = invoices.map((i) => ({
    amount:   safeNumber(i.amount),
    currency: i.currency || currency,
    due_date: i.due_date,
    status:   i.status,
  }))

  // ── 1. Runway critical ──────────────────────────────────────────────────
  const cashBalance = safeTx.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  )
  const threeMonthsAgo = monthsAgo(3, now)
  const last3Expenses = safeTx
    .filter((t) => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo)
    .reduce((s, t) => s + t.amount, 0)
  const avgMonthlyBurn = last3Expenses / 3
  const runwayMonths =
    avgMonthlyBurn > 0 && cashBalance > 0
      ? cashBalance / avgMonthlyBurn
      : avgMonthlyBurn === 0
      ? Infinity
      : 0

  if (isFinite(runwayMonths) && runwayMonths < 3 && avgMonthlyBurn > 0) {
    const daysLeft = Math.max(1, Math.round(runwayMonths * 30))
    const runOutDate = addDays(now, daysLeft)
    const months = runwayMonths.toFixed(1)
    alerts.push({
      id:         'runway-critical',
      severity:   'critical',
      title:      'Runway crítico',
      message: `Tu runway es de ${months} meses. A este ritmo de gasto, tu empresa se queda sin caja en ${fmtDate(runOutDate)}. Acción recomendada: revisar gastos o acelerar cobros.`,
      computed_at,
      action: { label: 'Ver burn rate', href: '/dashboard/burn-rate' },
    })
  }

  // ── 2. Overdue invoices ─────────────────────────────────────────────────
  const overdueInvoices = safeInvoices.filter((i) => {
    if (i.status === 'overdue') return true
    if (i.status === 'pending' && isValidDate(i.due_date) && i.due_date < today) return true
    return false
  })

  if (overdueInvoices.length > 0) {
    const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0)
    // Weeks of extra runway if the overdue amount were collected
    const weeksOfRunway =
      avgMonthlyBurn > 0
        ? Math.max(1, Math.round((totalOverdue / avgMonthlyBurn) * 4.33))
        : null
    const runwayLine =
      weeksOfRunway != null
        ? ` Cobrar estas facturas aumentaría tu runway ${weeksOfRunway} semana${weeksOfRunway === 1 ? '' : 's'}.`
        : ''

    alerts.push({
      id:         'invoices-overdue',
      severity:   'warning',
      title:      'Facturas vencidas',
      message: `Tienes ${overdueInvoices.length} factura${overdueInvoices.length === 1 ? '' : 's'} vencida${overdueInvoices.length === 1 ? '' : 's'} por un total de ${fmtCurrency(totalOverdue, currency)}.${runwayLine}`,
      computed_at,
      action: { label: 'Ver facturas', href: '/dashboard/facturas' },
    })
  }

  // ── 3. Expenses surge (>20% MoM) ────────────────────────────────────────
  const thisMonthStart = startOfMonth(now)
  const prevMonthStart = startOfMonth(monthsAgo(1, now))

  const thisMonthExpenses = safeTx.filter(
    (t) => t.type === 'expense' && new Date(t.date) >= thisMonthStart
  )
  const prevMonthExpenses = safeTx.filter((t) => {
    const d = new Date(t.date)
    return t.type === 'expense' && d >= prevMonthStart && d < thisMonthStart
  })

  const thisSum = thisMonthExpenses.reduce((s, t) => s + t.amount, 0)
  const prevSum = prevMonthExpenses.reduce((s, t) => s + t.amount, 0)

  if (prevSum > 0 && thisSum > prevSum * 1.2) {
    const deltaPct = Math.round(((thisSum - prevSum) / prevSum) * 100)

    // Find the category that grew the most in absolute terms
    const byCatThis: Record<string, number> = {}
    const byCatPrev: Record<string, number> = {}
    for (const t of thisMonthExpenses) byCatThis[t.category] = (byCatThis[t.category] ?? 0) + t.amount
    for (const t of prevMonthExpenses) byCatPrev[t.category] = (byCatPrev[t.category] ?? 0) + t.amount

    let topCategory = ''
    let topGrowth = 0
    for (const cat of Object.keys(byCatThis)) {
      const growth = (byCatThis[cat] ?? 0) - (byCatPrev[cat] ?? 0)
      if (growth > topGrowth) {
        topGrowth = growth
        topCategory = cat
      }
    }

    const catLine = topCategory
      ? ` La categoría que más creció fue ${topCategory} con ${fmtCurrency(topGrowth, currency)}.`
      : ''

    alerts.push({
      id:         'expenses-surge',
      severity:   'warning',
      title:      'Gastos disparados',
      message: `Tus gastos subieron un ${deltaPct}% este mes vs el mes anterior.${catLine}`,
      computed_at,
      action: { label: 'Ver movimientos', href: '/dashboard/movimientos' },
    })
  }

  return alerts
}
