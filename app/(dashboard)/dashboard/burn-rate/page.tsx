import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { Flame, TrendingDown, TrendingUp, ArrowDownRight, Upload } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Burn Rate' }

const CATEGORY_COLORS = [
  'bg-brand-500',
  'bg-blue-400',
  'bg-purple-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-teal-400',
]

export default async function BurnRatePage() {
  const { userId } = await auth()
  const supabase   = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  if (!profile?.id) return <EmptyState />

  // Fetch expenses for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: rawExpenses } = await supabase
    .from('transactions')
    .select('amount, date, category')
    .eq('profile_id', profile.id)
    .eq('type', 'expense')
    .gte('date', sixMonthsAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const expenses = rawExpenses ?? []
  if (expenses.length === 0) return <EmptyState />

  // Build 6-month slots (oldest → newest)
  const monthSlots: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    monthSlots.push({ key, label })
  }

  const monthlyTotals: Record<string, number> = {}
  for (const { key } of monthSlots) monthlyTotals[key] = 0

  for (const e of expenses) {
    const d   = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthlyTotals) monthlyTotals[key] += Number(e.amount)
  }

  const monthlyData = monthSlots.map(({ key, label }) => ({
    month: label,
    total: monthlyTotals[key],
  }))

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevDate        = new Date(now)
  prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonthKey    = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const currentTotal = monthlyTotals[currentMonthKey] ?? 0
  const prevTotal    = monthlyTotals[prevMonthKey] ?? 0
  const trendPct     = prevTotal > 0 ? (((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1) : '0.0'
  const improved     = currentTotal <= prevTotal
  const avg6         = Math.round(
    monthlyData.reduce((s, m) => s + m.total, 0) / monthlyData.length
  )

  const currentYear = now.getFullYear()
  const accumulated = expenses
    .filter(e => new Date(e.date).getFullYear() === currentYear)
    .reduce((s, e) => s + Number(e.amount), 0)

  // Category breakdown for the current month
  const catTotals: Record<string, number> = {}
  for (const e of expenses) {
    const d   = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key === currentMonthKey) {
      catTotals[e.category] = (catTotals[e.category] ?? 0) + Number(e.amount)
    }
  }

  const categories = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount], i) => ({
      label,
      amount,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      pct:   currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0,
    }))

  const currentMonthLabel = now.toLocaleDateString('es-ES', {
    month: 'long',
    year:  'numeric',
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Burn Rate</h1>
        <p className="text-gray-500 mt-1 text-sm">Gasto mensual operativo y su evolución</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Burn rate actual */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Burn Rate actual
            </p>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {formatCurrency(currentTotal)}
            <span className="text-sm font-medium text-gray-400 ml-1">/mes</span>
          </p>
          <span
            className={`inline-flex items-center gap-1 mt-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
              improved ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {improved ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
            {improved ? '' : '+'}{trendPct}% vs mes anterior
          </span>
        </div>

        {/* Promedio 6 meses */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Promedio 6 meses
            </p>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {formatCurrency(avg6)}
            <span className="text-sm font-medium text-gray-400 ml-1">/mes</span>
          </p>
          <p className="text-sm text-gray-500 mt-3">Basado en los últimos 6 meses</p>
        </div>

        {/* Acumulado año actual */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Acumulado {currentYear}
            </p>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {formatCurrency(accumulated)}
          </p>
          <p className="text-sm text-gray-500 mt-3">
            Ene –{' '}
            {now.toLocaleDateString('es-ES', { month: 'long' })} {currentYear}
          </p>
        </div>
      </div>

      {/* Breakdown + historic table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Desglose este mes</h2>
          <p className="text-xs text-gray-400 mb-5 capitalize">{currentMonthLabel}</p>

          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Sin gastos registrados este mes
            </p>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">{cat.label}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{cat.pct}% del total</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly history */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Histórico mensual</h2>
          <p className="text-xs text-gray-400 mb-5">Últimos 6 meses</p>
          <div className="space-y-2">
            {[...monthlyData].reverse().map((row, i) => {
              const prev = [...monthlyData].reverse()[i + 1]
              const diff = prev ? row.total - prev.total : 0
              return (
                <div
                  key={row.month}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm font-medium text-gray-700 capitalize">{row.month}</span>
                  <div className="flex items-center gap-3">
                    {prev && (
                      <span
                        className={`text-xs font-medium ${
                          diff > 0 ? 'text-red-500' : 'text-brand-600'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                      {formatCurrency(row.total)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Burn Rate</h1>
        <p className="text-gray-500 mt-1 text-sm">Gasto mensual operativo y su evolución</p>
      </div>
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-8 py-16 text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
          <Flame className="w-6 h-6 text-brand-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Sin datos de gasto todavía</h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed mb-6">
          Importa tus transacciones para ver la evolución de tu burn rate por categoría.
        </p>
        <Link
          href="/dashboard/importar"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar transacciones
        </Link>
      </div>
    </div>
  )
}
