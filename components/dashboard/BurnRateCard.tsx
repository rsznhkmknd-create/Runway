import { Flame, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  monthly: number
  trend: number
  prevMonthly: number
}

export default function BurnRateCard({ monthly, trend, prevMonthly }: Props) {
  const improved = trend <= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Burn Rate</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            improved
              ? 'bg-brand-50 text-brand-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          <TrendingDown className={`w-3 h-3 ${!improved ? 'rotate-180' : ''}`} />
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      </div>

      <div className="mt-2">
        <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
          {formatCurrency(monthly)}
          <span className="text-sm font-medium text-gray-400 ml-1">/mes</span>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Mes anterior:{' '}
          <span className="font-semibold text-gray-700">
            {formatCurrency(prevMonthly)}
          </span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Nóminas</p>
          <p className="font-semibold text-gray-900 text-sm mt-0.5">{formatCurrency(18000)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Operaciones</p>
          <p className="font-semibold text-gray-900 text-sm mt-0.5">{formatCurrency(12000)}</p>
        </div>
      </div>
    </div>
  )
}
