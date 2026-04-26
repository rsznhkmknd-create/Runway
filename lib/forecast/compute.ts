/**
 * 12-month cash forecast — pure deterministic math, no IO, no IA.
 *
 * Algorithm:
 *   1. Bucket every transaction by YYYY-MM. Run a cumulative balance
 *      across the sorted timeline so we know cash at end of every month.
 *   2. Last 6 historical buckets are surfaced as-is (real income/expense).
 *   3. Baseline metrics from the last 3 COMPLETED months (skip the
 *      current partial month so the average isn't dragged down):
 *        - avgIncome3m, avgExpense3m
 *        - growthRate = mean of (M-1/M-2 - 1) and (M-2/M-3 - 1),
 *          clamped to ±50% so a single anomalous month doesn't blow up
 *          the projection.
 *   4. Apply the scenario multiplier to the growth rate:
 *        conservative = 0.8 · realistic = 1.0 · optimistic = 1.2
 *      Multiplicative (not additive) so the scenario remains meaningful
 *      whether the user grows 1%/mo or 30%/mo.
 *   5. Project 12 months forward: income compounds by appliedGrowth,
 *      expense stays flat at avgExpense3m.
 *   6. Cumulative cash on the projection: starts at the current
 *      real balance, walks forward applying (income - expense) per month.
 *   7. Break-even: first projected month where cash crosses ≤0.
 */

export type Scenario = 'conservative' | 'realistic' | 'optimistic'

export type ForecastTx = {
  amount: number
  type: 'income' | 'expense'
  date: string  // ISO YYYY-MM-DD
}

export type MonthBucket = {
  /** Sortable key, YYYY-MM */
  month: string
  /** Display label, e.g. "ene 24" */
  label: string
  income: number
  expense: number
  net: number
  /** End-of-month cash balance. Only filled on projection rows; null on history. */
  cash: number | null
  isProjection: boolean
}

export type ForecastResult = {
  history: MonthBucket[]
  projection: MonthBucket[]
  scenario: Scenario
  /** Cash balance "today" (sum of all real income - real expense). */
  startingCash: number
  /** Avg income/expense over the last 3 completed months. */
  avgIncome3m: number
  avgExpense3m: number
  /** Baseline monthly growth rate from real data, clamped to [-0.5, 0.5]. */
  baselineGrowthRate: number
  /** Multiplier applied to baselineGrowthRate (0.8 / 1.0 / 1.2). */
  growthMultiplier: number
  /** baselineGrowthRate × growthMultiplier — what we actually applied. */
  appliedGrowthRate: number
  kpis: {
    totalIncome12m: number
    totalExpense12m: number
    cashAtMonth12: number
    breakEvenMonth: { month: string; label: string; monthIndex: number } | null
  }
}

const MONTH_LABEL_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: '2-digit',
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function multiplierFor(scenario: Scenario): number {
  if (scenario === 'conservative') return 0.8
  if (scenario === 'optimistic') return 1.2
  return 1.0
}

export function computeForecast(
  transactions: ForecastTx[],
  scenario: Scenario = 'realistic'
): ForecastResult {
  const today = new Date()
  const currentMonthStart = startOfMonth(today)

  // ── 1. Bucket by month + cumulative balance ──────────────────────────
  const buckets = new Map<string, { income: number; expense: number }>()
  let cashThroughToday = 0
  for (const tx of transactions) {
    const d = new Date(tx.date)
    if (Number.isNaN(d.getTime())) continue
    const amt = Math.abs(Number(tx.amount))
    if (!Number.isFinite(amt)) continue
    const k = monthKey(d)
    const b = buckets.get(k) ?? { income: 0, expense: 0 }
    if (tx.type === 'income') {
      b.income += amt
      cashThroughToday += amt
    } else {
      b.expense += amt
      cashThroughToday -= amt
    }
    buckets.set(k, b)
  }

  // ── 2. Build the last 6 historical buckets (current month included) ──
  const history: MonthBucket[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1)
    const k = monthKey(d)
    const b = buckets.get(k) ?? { income: 0, expense: 0 }
    history.push({
      month: k,
      label: d.toLocaleDateString('es-ES', MONTH_LABEL_OPTS),
      income: Math.round(b.income),
      expense: Math.round(b.expense),
      net: Math.round(b.income - b.expense),
      cash: null, // Cash line only on projection per spec.
      isProjection: false,
    })
  }

  // ── 3. Baseline avg + growth from last 3 COMPLETED months ────────────
  const last3Buckets: { income: number; expense: number }[] = []
  for (let i = 3; i >= 1; i--) {
    const d = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1)
    last3Buckets.push(buckets.get(monthKey(d)) ?? { income: 0, expense: 0 })
  }

  const avgIncome3m = last3Buckets.reduce((s, b) => s + b.income, 0) / 3
  const avgExpense3m = last3Buckets.reduce((s, b) => s + b.expense, 0) / 3

  // Growth rate: mean of two month-over-month changes when both pairs are valid.
  let growthRate = 0
  const [m3, m2, m1] = last3Buckets // M-3, M-2, M-1
  const r1 = m3 && m3.income > 0 ? m2!.income / m3.income - 1 : null
  const r2 = m2 && m2.income > 0 ? m1!.income / m2.income - 1 : null
  if (r1 != null && r2 != null) {
    growthRate = (r1 + r2) / 2
  } else if (r1 != null) {
    growthRate = r1
  } else if (r2 != null) {
    growthRate = r2
  }
  // Clamp so a single anomalous month doesn't generate a hockey-stick projection.
  growthRate = Math.max(-0.5, Math.min(0.5, growthRate))

  const growthMultiplier = multiplierFor(scenario)
  const appliedGrowthRate = growthRate * growthMultiplier

  // ── 4. Project 12 months forward ─────────────────────────────────────
  // Income starts at the avg of the last 3 completed months and compounds
  // by appliedGrowthRate. Expense stays flat at the average.
  const projection: MonthBucket[] = []
  let runningIncome = avgIncome3m
  const startingCash = Math.round(cashThroughToday)
  let runningCash = cashThroughToday

  for (let i = 1; i <= 12; i++) {
    const d = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + i, 1)
    runningIncome = runningIncome * (1 + appliedGrowthRate)
    const income = Math.max(0, runningIncome)
    const expense = avgExpense3m
    const net = income - expense
    runningCash += net
    projection.push({
      month: monthKey(d),
      label: d.toLocaleDateString('es-ES', MONTH_LABEL_OPTS),
      income: Math.round(income),
      expense: Math.round(expense),
      net: Math.round(net),
      cash: Math.round(runningCash),
      isProjection: true,
    })
  }

  // ── 5. KPIs ──────────────────────────────────────────────────────────
  const totalIncome12m = projection.reduce((s, p) => s + p.income, 0)
  const totalExpense12m = projection.reduce((s, p) => s + p.expense, 0)
  const cashAtMonth12 = projection.length > 0 ? (projection[projection.length - 1]!.cash ?? 0) : 0

  let breakEvenMonth: ForecastResult['kpis']['breakEvenMonth'] = null
  for (let i = 0; i < projection.length; i++) {
    const p = projection[i]!
    if ((p.cash ?? 0) <= 0) {
      breakEvenMonth = { month: p.month, label: p.label, monthIndex: i + 1 }
      break
    }
  }

  return {
    history,
    projection,
    scenario,
    startingCash,
    avgIncome3m: Math.round(avgIncome3m),
    avgExpense3m: Math.round(avgExpense3m),
    baselineGrowthRate: growthRate,
    growthMultiplier,
    appliedGrowthRate,
    kpis: {
      totalIncome12m: Math.round(totalIncome12m),
      totalExpense12m: Math.round(totalExpense12m),
      cashAtMonth12,
      breakEvenMonth,
    },
  }
}
