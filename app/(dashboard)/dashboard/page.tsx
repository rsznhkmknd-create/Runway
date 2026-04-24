import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import RunwayCard from '@/components/dashboard/RunwayCard'
import BurnRateCard from '@/components/dashboard/BurnRateCard'
import AccountsReceivableCard from '@/components/dashboard/AccountsReceivableCard'
import CashFlowChart, { type CashFlowDataPoint } from '@/components/dashboard/CashFlowChart'
import RecentTransactions, { type RecentTransaction } from '@/components/dashboard/RecentTransactions'
import ProfileCompletionBanner from '@/components/dashboard/ProfileCompletionBanner'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyProfile, isProfileComplete } from '@/lib/supabase/company-profile'
import { safeNumber, isValidDate, todayIso } from '@/lib/safe'
import DailyInsights from '@/components/dashboard/DailyInsights'
import { KpiBento } from '@/components/dashboard/kpi-bento'
import { ChartReveal } from '@/components/dashboard/chart-reveal'
import type { Insight } from '@/lib/insights/types'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

type DbTransaction = {
  id: string
  amount: number
  type: string
  date: string
  category: string
  description: string | null
}

interface Metrics {
  runway:     { months: number; trend: number; cashBalance: number }
  burnRate:   { monthly: number; trend: number; prevMonthly: number }
  receivable: { total: number; overdue: number; count: number }
  hasData:    boolean
}

function calculateMetrics(
  transactions: DbTransaction[],
  invoices: { amount: number; status: string }[]
): Metrics {
  if (!transactions.length && !invoices.length) {
    return {
      runway:     { months: 0, trend: 0, cashBalance: 0 },
      burnRate:   { monthly: 0, trend: 0, prevMonthly: 0 },
      receivable: { total: 0, overdue: 0, count: 0 },
      hasData:    false,
    }
  }

  const now            = new Date()
  const thisMonthStart = startOfMonth(now)
  const prevMonthStart = startOfMonth(monthsAgo(1))
  const threeMonthsAgo = monthsAgo(3)

  // Filter out transactions with invalid dates or amounts so they can't
  // break downstream date math.
  const safeTxs = transactions.filter(
    (t) => isValidDate(t.date) && isFinite(safeNumber(t.amount))
  )

  const cashBalance = safeTxs.reduce(
    (acc, t) => acc + (t.type === 'income' ? safeNumber(t.amount) : -safeNumber(t.amount)),
    0
  )

  const thisMonthExpenses = safeTxs
    .filter((t) => t.type === 'expense' && new Date(t.date) >= thisMonthStart)
    .reduce((acc, t) => acc + safeNumber(t.amount), 0)

  const prevMonthExpenses = safeTxs
    .filter((t) => {
      const d = new Date(t.date)
      return t.type === 'expense' && d >= prevMonthStart && d < thisMonthStart
    })
    .reduce((acc, t) => acc + safeNumber(t.amount), 0)

  const last3Expenses = safeTxs
    .filter((t) => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo)
    .reduce((acc, t) => acc + safeNumber(t.amount), 0)
  const avgMonthlyBurn = last3Expenses / 3

  const runwayMonths =
    avgMonthlyBurn > 0 && cashBalance > 0
      ? Math.round(cashBalance / avgMonthlyBurn)
      : 0

  const burnTrend =
    prevMonthExpenses > 0
      ? Math.round(((thisMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100)
      : 0

  const runwayTrend = -Math.sign(burnTrend) * Math.min(Math.abs(burnTrend), 99)

  const pendingInvoices   = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
  const receivableTotal   = pendingInvoices.reduce((acc, i) => acc + safeNumber(i.amount), 0)
  const receivableOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((acc, i) => acc + safeNumber(i.amount), 0)

  return {
    runway:     { months: safeNumber(runwayMonths), trend: safeNumber(runwayTrend), cashBalance: Math.max(cashBalance, 0) },
    burnRate:   { monthly: safeNumber(thisMonthExpenses), trend: safeNumber(burnTrend), prevMonthly: safeNumber(prevMonthExpenses) },
    receivable: { total: safeNumber(receivableTotal), overdue: safeNumber(receivableOverdue), count: pendingInvoices.length },
    hasData:    safeTxs.length > 0,
  }
}

function buildCashFlowData(transactions: DbTransaction[]): CashFlowDataPoint[] {
  const months: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-ES', { month: 'short' })
    months.push({ key, label })
  }

  const totals: Record<string, { ingresos: number; gastos: number }> = {}
  for (const { key } of months) totals[key] = { ingresos: 0, gastos: 0 }

  for (const t of transactions) {
    if (!isValidDate(t.date)) continue
    const d   = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (totals[key]) {
      const amt = safeNumber(t.amount)
      if (t.type === 'income') totals[key].ingresos += amt
      else                     totals[key].gastos   += amt
    }
  }

  return months.map(({ key, label }) => ({ month: label, ...totals[key] }))
}

function getTopExpenseCategories(transactions: DbTransaction[]) {
  const thisMonthStart = startOfMonth(new Date())
  const catTotals: Record<string, number> = {}

  for (const t of transactions) {
    if (!isValidDate(t.date)) continue
    if (t.type === 'expense' && new Date(t.date) >= thisMonthStart) {
      catTotals[t.category] = (catTotals[t.category] ?? 0) + safeNumber(t.amount)
    }
  }

  return Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label, amount]) => ({ label, amount }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId } = await auth()
  const user       = await currentUser()
  const supabase   = createServiceClient()

  const profile = await getCompanyProfile(userId!)
  const currency = profile?.currency ?? 'EUR'
  const profileComplete = isProfileComplete(profile)

  let metrics: Metrics = {
    runway:     { months: 0, trend: 0, cashBalance: 0 },
    burnRate:   { monthly: 0, trend: 0, prevMonthly: 0 },
    receivable: { total: 0, overdue: 0, count: 0 },
    hasData:    false,
  }
  let cashFlowData: CashFlowDataPoint[]                  = buildCashFlowData([])
  let recentTxs: RecentTransaction[]                     = []
  let topCategories: { label: string; amount: number }[] = []
  let initialInsights: { insights: Insight[]; hasData: boolean; cached: boolean } | null = null

  if (profile?.id) {
    const [txResult, invResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, amount, type, date, category, description')
        .eq('profile_id', profile.id)
        .order('date', { ascending: false }),
      supabase
        .from('invoices')
        .select('amount, status')
        .eq('profile_id', profile.id),
    ])

    // Propagate Supabase errors to the nearest error boundary so the user sees
    // a "Retry" UI instead of a blank / misleading-empty dashboard.
    if (txResult.error) {
      throw new Error(
        `No pudimos cargar tus transacciones: ${txResult.error.message}`
      )
    }
    if (invResult.error) {
      throw new Error(
        `No pudimos cargar tus facturas: ${invResult.error.message}`
      )
    }

    const txs     = (txResult.data ?? []).map((t) => ({
      ...t,
      amount: safeNumber(t.amount),
    })) as DbTransaction[]
    const invs    = (invResult.data ?? []).map((i) => ({
      ...i,
      amount: safeNumber(i.amount),
    }))

    metrics       = calculateMetrics(txs, invs)
    cashFlowData  = buildCashFlowData(txs)
    recentTxs     = txs.slice(0, 6) as RecentTransaction[]
    topCategories = getTopExpenseCategories(txs)

    // Read today's cached insights — single row lookup, non-blocking.
    // If found, client renders immediately; if not, client calls the API
    // route which generates + stores.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cached = await (supabase.from('daily_insights') as any)
      .select('insights')
      .eq('profile_id', profile.id)
      .eq('date', todayIso())
      .maybeSingle()
    if (cached.data) {
      const payload = cached.data.insights as { insights?: Insight[] } | null
      initialInsights = {
        insights: payload?.insights ?? [],
        hasData:  true,
        cached:   true,
      }
    }
  }

  const firstName = user?.firstName ?? 'equipo'

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-600/10 px-2.5 py-0.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase text-brand-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-600 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
            </span>
            En vivo
          </span>
        </div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] text-text-primary">
          Buenos días, {firstName}
        </h1>
        <p className="text-text-muted mt-1 text-[13.5px]">
          Aquí tienes el resumen financiero de hoy —{' '}
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day:     'numeric',
            month:   'long',
            year:    'numeric',
          })}
        </p>
      </div>

      {!profileComplete && <ProfileCompletionBanner />}

      {metrics.hasData && <DailyInsights initial={initialInsights} />}

      {!metrics.hasData && (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-8 py-12 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">
            Tu runway empieza aquí
          </h2>
          <p className="text-sm text-text-muted max-w-xs mx-auto leading-relaxed mb-6">
            Importa tu primer archivo de transacciones y en segundos verás tu runway,
            burn rate y flujo de caja al detalle.
          </p>
          <Link
            href="/dashboard/importar"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white text-sm font-semibold
                       rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20"
          >
            <Upload className="w-4 h-4" />
            Importar mi primer archivo
          </Link>
          <p className="text-xs text-text-muted mt-4">
            Compatible con Excel (.xlsx) y CSV · Tus datos son privados y seguros
          </p>
        </div>
      )}

      {/* Bento grid de KPIs con animaciones sutiles */}
      {metrics.hasData && (
        <KpiBento
          runway={metrics.runway}
          burnRate={metrics.burnRate}
          receivable={metrics.receivable}
          currency={currency}
        />
      )}

      {/* Charts + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartReveal delay={120} className="lg:col-span-2">
          <CashFlowChart data={cashFlowData} currency={currency} />
        </ChartReveal>
        <ChartReveal delay={240}>
          <RecentTransactions transactions={recentTxs} currency={currency} />
        </ChartReveal>
      </div>
    </div>
  )
}
