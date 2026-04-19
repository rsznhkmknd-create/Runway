import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import RunwayCard from '@/components/dashboard/RunwayCard'
import BurnRateCard from '@/components/dashboard/BurnRateCard'
import AccountsReceivableCard from '@/components/dashboard/AccountsReceivableCard'
import CashFlowChart from '@/components/dashboard/CashFlowChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
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

interface Metrics {
  runway:    { months: number; trend: number; cashBalance: number }
  burnRate:  { monthly: number; trend: number; prevMonthly: number }
  receivable:{ total: number; overdue: number; count: number }
  hasData:   boolean
}

function calculateMetrics(
  transactions: { amount: number; type: string; date: string }[],
  invoices:     { amount: number; status: string }[]
): Metrics {
  if (!transactions.length && !invoices.length) {
    return {
      runway:     { months: 0, trend: 0, cashBalance: 0 },
      burnRate:   { monthly: 0, trend: 0, prevMonthly: 0 },
      receivable: { total: 0, overdue: 0, count: 0 },
      hasData:    false,
    }
  }

  const now         = new Date()
  const thisMonthStart = startOfMonth(now)
  const prevMonthStart = startOfMonth(monthsAgo(1))
  const threeMonthsAgo = monthsAgo(3)

  // Cash balance: all time income − expenses
  const cashBalance = transactions.reduce((acc, t) => {
    return acc + (t.type === 'income' ? t.amount : -t.amount)
  }, 0)

  // Burn rate: expenses in current month
  const thisMonthExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= thisMonthStart)
    .reduce((acc, t) => acc + t.amount, 0)

  // Previous month expenses
  const prevMonthExpenses = transactions
    .filter(t => {
      const d = new Date(t.date)
      return t.type === 'expense' && d >= prevMonthStart && d < thisMonthStart
    })
    .reduce((acc, t) => acc + t.amount, 0)

  // Average monthly burn over last 3 months (for runway calc)
  const last3Expenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo)
    .reduce((acc, t) => acc + t.amount, 0)
  const avgMonthlyBurn = last3Expenses / 3

  // Runway (months)
  const runwayMonths =
    avgMonthlyBurn > 0 && cashBalance > 0
      ? Math.round(cashBalance / avgMonthlyBurn)
      : 0

  // Burn trend (% change vs previous month)
  const burnTrend =
    prevMonthExpenses > 0
      ? Math.round(((thisMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100)
      : 0

  // Runway trend (simplified: inverse of burn trend)
  const runwayTrend = -Math.sign(burnTrend) * Math.min(Math.abs(burnTrend), 99)

  // Accounts receivable from invoices
  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
  const receivableTotal   = pendingInvoices.reduce((acc, i) => acc + i.amount, 0)
  const receivableOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((acc, i) => acc + i.amount, 0)

  return {
    runway: {
      months:      runwayMonths,
      trend:       runwayTrend,
      cashBalance: Math.max(cashBalance, 0),
    },
    burnRate: {
      monthly:     thisMonthExpenses,
      trend:       burnTrend,
      prevMonthly: prevMonthExpenses,
    },
    receivable: {
      total:  receivableTotal,
      overdue: receivableOverdue,
      count:  pendingInvoices.length,
    },
    hasData: transactions.length > 0,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId } = auth()
  const user = await currentUser()

  const supabase = createServiceClient()

  // Obtener profile_id
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

  if (profile?.id) {
    const [{ data: transactions }, { data: invoices }] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('profile_id', profile.id),
      supabase
        .from('invoices')
        .select('amount, status')
        .eq('profile_id', profile.id),
    ])

    metrics = calculateMetrics(transactions ?? [], invoices ?? [])
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

      {/* Empty state banner */}
      {!metrics.hasData && (
        <div className="flex items-center justify-between gap-4 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-800">
                Aún no tienes datos importados
              </p>
              <p className="text-xs text-brand-600/70 mt-0.5">
                Las métricas se mostrarán en cero hasta que importes tus primeras transacciones.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/importar"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition-colors"
          >
            Importar datos
            <Upload className="w-3.5 h-3.5" />
          </Link>
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
          <CashFlowChart />
        </div>
        <div>
          <RecentTransactions />
        </div>
      </div>

    </div>
  )
}
