import type { Metadata } from 'next'
import { Flame, TrendingDown, TrendingUp, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Burn Rate' }

const monthlyData = [
  { month: 'Nov 2025', total: 31200, nominas: 18000, ops: 8200, tech: 3000, marketing: 2000 },
  { month: 'Dic 2025', total: 34800, nominas: 18000, ops: 9800, tech: 4000, marketing: 3000 },
  { month: 'Ene 2026', total: 30500, nominas: 18000, ops: 7500, tech: 3000, marketing: 2000 },
  { month: 'Feb 2026', total: 29800, nominas: 18000, ops: 7200, tech: 2800, marketing: 1800 },
  { month: 'Mar 2026', total: 31200, nominas: 18000, ops: 8000, tech: 3200, marketing: 2000 },
  { month: 'Abr 2026', total: 30000, nominas: 18000, ops: 7500, tech: 2800, marketing: 1700 },
]

const categories = [
  { label: 'Nóminas', amount: 18000, color: 'bg-brand-500', pct: 60 },
  { label: 'Operaciones', amount: 7500, color: 'bg-blue-400', pct: 25 },
  { label: 'Tecnología', amount: 2800, color: 'bg-purple-400', pct: 9.3 },
  { label: 'Marketing', amount: 1700, color: 'bg-orange-400', pct: 5.7 },
]

const current = monthlyData[monthlyData.length - 1]
const prev = monthlyData[monthlyData.length - 2]
const trendPct = (((current.total - prev.total) / prev.total) * 100).toFixed(1)
const improved = current.total <= prev.total

export default function BurnRatePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Burn Rate</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gasto mensual operativo y su evolución
        </p>
      </div>

      {/* KPI top row */}
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
            {formatCurrency(current.total)}
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
            {formatCurrency(
              Math.round(monthlyData.reduce((s, m) => s + m.total, 0) / monthlyData.length)
            )}
            <span className="text-sm font-medium text-gray-400 ml-1">/mes</span>
          </p>
          <p className="text-sm text-gray-500 mt-3">Basado en los últimos 6 meses</p>
        </div>

        {/* Gasto acumulado */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Acumulado 2026
            </p>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {formatCurrency(
              monthlyData.slice(2).reduce((s, m) => s + m.total, 0)
            )}
          </p>
          <p className="text-sm text-gray-500 mt-3">Ene – Abr 2026</p>
        </div>
      </div>

      {/* Breakdown + histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Desglose por categoría */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Desglose este mes</h2>
          <p className="text-xs text-gray-400 mb-5">Abril 2026</p>
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
        </div>

        {/* Tabla histórica */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Histórico mensual</h2>
          <p className="text-xs text-gray-400 mb-5">Últimos 6 meses</p>
          <div className="space-y-2">
            {[...monthlyData].reverse().map((row, i) => {
              const prevRow = [...monthlyData].reverse()[i + 1]
              const diff = prevRow ? row.total - prevRow.total : 0
              return (
                <div
                  key={row.month}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm font-medium text-gray-700">{row.month}</span>
                  <div className="flex items-center gap-3">
                    {prevRow && (
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
