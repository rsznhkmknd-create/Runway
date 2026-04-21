import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import RunwayCard from '@/components/dashboard/RunwayCard'
import BurnRateCard from '@/components/dashboard/BurnRateCard'
import AccountsReceivableCard from '@/components/dashboard/AccountsReceivableCard'
import CashFlowChart, { type CashFlowDataPoint } from '@/components/dashboard/CashFlowChart'
import RecentTransactions, { type RecentTransaction } from '@/components/dashboard/RecentTransactions'
import { createServiceClient } from '@/lib/supabase/server'

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

  const cashBalance = transactions.reduce(
    (acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount),
    0
  )

  const thisMonthExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= thisMonthStart)
    .reduce((acc, t) => acc + t.amount, 0)

  const prevMonthExpenses = transactions
    .filter(t => {
      const d = new Date(t.date)
      return t.type === 'expense' && d >= prevMonthStart && d < thisMonthStart
    })
    .reduce((acc, t) => acc + t.amount, 0)

  const last3Expenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo)
    .reduce((acc, t) => acc + t.amount, 0)
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
  const receivableTotal   = pendingInvoices.reduce((acc, i) => acc + i.amount, 0)
  const receivableOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((acc, i) => acc + i.amount, 0)

  return {
    runway:     { months: runwayMonths, trend: runwayTrend, cashBalance: Math.max(cashBalance, 0) },
    burnRate:   { monthly: thisMonthExpenses, trend: burnTrend, prevMonthly: prevMonthExpenses },
    receivable: { total: receivableTotal, overdue: receivableOverdue, count: pendingInvoices.length },
    hasData:    transactions.length > 0,
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
    const d   = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (totals[key]) {
      if (t.type === 'income') totals[key].ingresos += t.amount
      else                     totals[key].gastos   += t.amount
    }
  }

  return months.map(({ key, label }) => ({ month: label, ...totals[key] }))
}

function getTopExpenseCategories(transactions: DbTransaction[]) {
  const thisMonthStart = startOfMonth(new Date())
  const catTotals: Record<string, number> = {}

  for (const t of transactions) {
    if (t.type === 'expense' && new Date(t.date) >= thisMonthStart) {
      catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  let metrics: Metrics = {
    runway:     { months: 0, trend: 0, cashBalance: 0 },
    burnRate:   { monthly: 0, trend: 0, prevMonthly: 0 },
    receivable: { total: 0, overdue: 0, count: 0 },
    hasData:    false,
  }
  let cashFlowData: CashFlowDataPoint[]                  = buildCashFlowData([])
  let recentTxs: RecentTransaction[]                     = []
  let topCategories: { label: string; amount: number }[] = []

  if (profile?.id) {
    const [{ data: transactions }, { data: invoices }] = await Promise.all([
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

    const txs     = (transactions ?? []) as DbTransaction[]
    metrics       = calculateMetrics(txs, invoices ?? [])
    cashFlowData  = buildCashFlowData(txs)
    recentTxs     = txs.slice(0, 6) as RecentTransaction[]
    topCategories = getTopExpenseCategories(txs)
  }

  const firstName = user?.firstName ?? 'equipo'

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos días, {firstName}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Aquí tienes el resumen financiero de hoy —{' '}
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day:     'numeric',
            month:   'long',
            year:    'numeric',
          })}
        </p>
      </div>

      {/* Empty state */}
      {!metrics.hasData && (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-8 py-12 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Tu runway empieza aquí
          </h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed mb-6">
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
          <p className="text-xs text-gray-400 mt-4">
            Compatible con Excel (.xlsx) y CSV · Tus datos son privados y seguros
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <RunwayCard
          months={metrics.runway.months}
          trend={metrics.runway.trend}
          cashBalance={metrics.runway.cashBalance}
        />
        <BurnRateCard
          monthly={metrics.burnRate.monthly}
          trend={metrics.burnRate.trend}
          prevMonthly={metrics.burnRate.prevMonthly}
          topCategories={topCategories}
        />
        <AccountsReceivableCard
          total={metrics.receivable.total}
          overdue={metrics.receivable.overdue}
          count={metrics.receivable.count}
        />
      </div>

      {/* Charts + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlowData} />
        </div>
        <div>
          <RecentTransactions transactions={recentTxs} />
        </div>
      </div>

    </div>
  )
}
