import { Clock, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  months: number
  trend: number
  cashBalance: number
}

export default function RunwayCard({ months, trend, cashBalance }: Props) {
  const positive = trend >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Runway</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            positive
              ? 'bg-brand-50 text-brand-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          <TrendingUp className={`w-3 h-3 ${!positive ? 'rotate-180' : ''}`} />
          {positive ? '+' : ''}{trend} meses
        </span>
      </div>

      <div className="mt-2">
        <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
          {months}
          <span className="text-2xl font-semibold text-gray-400 ml-1">meses</span>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Saldo actual:{' '}
          <span className="font-semibold text-gray-700">
            {formatCurrency(cashBalance)}
          </span>
        </p>
      </div>

      {/* Visual progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>0 meses</span>
          <span>24 meses</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((months / 24) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
