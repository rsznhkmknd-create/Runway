import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { currentUser } from '@clerk/nextjs/server'
import RunwayCard from '@/components/dashboard/RunwayCard'
import BurnRateCard from '@/components/dashboard/BurnRateCard'
import AccountsReceivableCard from '@/components/dashboard/AccountsReceivableCard'
import CashFlowChart from '@/components/dashboard/CashFlowChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const user = await currentUser()

  // ─── Mock data (reemplazar con queries a Supabase) ───────────────────────
  const metrics = {
    runway: {
      months: 14,
      trend: +2,
      cashBalance: 420000,
    },
    burnRate: {
      monthly: 30000,
      trend: -5,
      prevMonthly: 31500,
    },
    accountsReceivable: {
      total: 87500,
      overdue: 12400,
      count: 8,
    },
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
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

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
          total={metrics.accountsReceivable.total}
          overdue={metrics.accountsReceivable.overdue}
          count={metrics.accountsReceivable.count}
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
