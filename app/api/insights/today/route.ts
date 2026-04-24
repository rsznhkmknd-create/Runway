import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDailyInsights, type FinancialContext } from '@/lib/insights/generate'
import { safeNumber, isValidDate, todayIso } from '@/lib/safe'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import type { DailyInsightsRow, Insight } from '@/lib/insights/types'

const MIN_TRANSACTIONS_FOR_INSIGHTS = 5

type Transaction = {
  amount: number | string
  type:   'income' | 'expense'
  date:   string
}

type Invoice = {
  amount: number | string
  status: 'pending' | 'paid' | 'overdue'
  due_date: string
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function monthsAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() - n)
  return d
}

function buildContext(
  transactions: Transaction[],
  invoices: Invoice[],
  currency: string,
  companyName: string | null
): FinancialContext {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const prevMonthStart = startOfMonth(monthsAgo(1, now))
  const threeMonthsAgo = monthsAgo(3, now)
  const today = todayIso()

  const safeTx = transactions
    .filter((t) => isValidDate(t.date))
    .map((t) => ({ ...t, amount: safeNumber(t.amount) }))

  const cash = safeTx.reduce(
    (s, t) => s + (t.type === 'income' ? t.amount : -t.amount),
    0
  )

  const last3Exp = safeTx
    .filter((t) => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo)
    .reduce((s, t) => s + t.amount, 0)
  const avgMonthlyBurn = last3Exp / 3
  const runwayMonths =
    avgMonthlyBurn > 0 && cash > 0 ? Number((cash / avgMonthlyBurn).toFixed(1)) : null

  const sum = (filter: (t: Transaction & { amount: number }) => boolean) =>
    safeTx.filter(filter).reduce((s, t) => s + t.amount, 0)

  const incomeThis = sum((t) => t.type === 'income' && new Date(t.date) >= thisMonthStart)
  const incomePrev = sum((t) => {
    const d = new Date(t.date)
    return t.type === 'income' && d >= prevMonthStart && d < thisMonthStart
  })
  const expThis = sum((t) => t.type === 'expense' && new Date(t.date) >= thisMonthStart)
  const expPrev = sum((t) => {
    const d = new Date(t.date)
    return t.type === 'expense' && d >= prevMonthStart && d < thisMonthStart
  })

  const pct = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0

  const pending = invoices.filter(
    (i) => i.status === 'pending' && isValidDate(i.due_date) && i.due_date >= today
  )
  const overdue = invoices.filter(
    (i) =>
      i.status === 'overdue' ||
      (i.status === 'pending' && isValidDate(i.due_date) && i.due_date < today)
  )

  return {
    currency,
    company_name:          companyName,
    cash_balance:          Math.round(cash * 100) / 100,
    runway_months:         runwayMonths,
    burn_rate_monthly:     Math.round(avgMonthlyBurn * 100) / 100,
    burn_rate_trend_pct:   pct(expThis, expPrev),
    income_this_month:     Math.round(incomeThis * 100) / 100,
    income_prev_month:     Math.round(incomePrev * 100) / 100,
    income_delta_pct:      pct(incomeThis, incomePrev),
    expenses_this_month:   Math.round(expThis * 100) / 100,
    expenses_prev_month:   Math.round(expPrev * 100) / 100,
    expense_delta_pct:     pct(expThis, expPrev),
    pending_invoices_total: pending.reduce((s, i) => s + safeNumber(i.amount), 0),
    pending_invoices_count: pending.length,
    overdue_invoices_total: overdue.reduce((s, i) => s + safeNumber(i.amount), 0),
    overdue_invoices_count: overdue.length,
    transactions_count:     safeTx.length,
  }
}

export const GET = withRateLimit(async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, currency, company_name')
    .eq('clerk_id', userId)
    .single()

  if (!profile?.id) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const today = todayIso()

  // ── Cache hit ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = await (supabase.from('daily_insights') as any)
    .select('id, date, insights, created_at')
    .eq('profile_id', profile.id)
    .eq('date', today)
    .maybeSingle()

  if (cached.data) {
    return NextResponse.json({
      insights: (cached.data.insights as { insights: Insight[] }).insights ?? [],
      hasData:  true,
      cached:   true,
    })
  }

  // ── Fetch data to evaluate sufficiency + build context ────────────────
  const [txRes, invRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('profile_id', profile.id),
    supabase
      .from('invoices')
      .select('amount, status, due_date')
      .eq('profile_id', profile.id),
  ])

  const transactions = (txRes.data ?? []) as Transaction[]
  const invoices     = (invRes.data ?? []) as Invoice[]

  if (transactions.length < MIN_TRANSACTIONS_FOR_INSIGHTS) {
    // Don't cache — user will import data and we want fresh insights next time
    return NextResponse.json({
      insights: [],
      hasData:  false,
      cached:   false,
    })
  }

  const ctx = buildContext(
    transactions,
    invoices,
    profile.currency,
    profile.company_name
  )

  let payload
  try {
    payload = await generateDailyInsights(ctx)
  } catch (err) {
    console.error('[insights/today] Claude generation failed:', err)
    return NextResponse.json(
      { error: 'No se pudieron generar los insights. Inténtalo de nuevo en un momento.' },
      { status: 502 }
    )
  }

  if (payload.insights.length === 0) {
    return NextResponse.json({
      insights: [],
      hasData:  true,
      cached:   false,
    })
  }

  // ── Persist with UNIQUE(profile_id, date) lock ────────────────────────
  // If another request generated insights concurrently, the insert fails and
  // we re-read the winning row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins = await (supabase.from('daily_insights') as any)
    .insert({
      profile_id: profile.id,
      date:       today,
      insights:   payload,
    })
    .select('id, date, insights, created_at')
    .single()

  let final: Insight[] = payload.insights
  if (ins.error) {
    // Likely unique constraint — re-read
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retry = await (supabase.from('daily_insights') as any)
      .select('insights')
      .eq('profile_id', profile.id)
      .eq('date', today)
      .maybeSingle()
    if (retry.data) {
      final = (retry.data.insights as { insights: Insight[] }).insights ?? []
    }
  }

  return NextResponse.json({
    insights: final,
    hasData:  true,
    cached:   false,
  })
})
