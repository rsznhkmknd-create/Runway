import { Receipt, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  total: number
  overdue: number
  count: number
}

export default function AccountsReceivableCard({ total, overdue, count }: Props) {
  const overduePercent = Math.round((overdue / total) * 100)
  const onTimeAmount = total - overdue

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Por Cobrar</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
          {count} facturas
        </span>
      </div>

      <div className="mt-2">
        <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
          {formatCurrency(total)}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Total pendiente de cobro
        </p>
      </div>

      {overdue > 0 && (
        <div className="mt-4 flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700">
              {formatCurrency(overdue)} vencido ({overduePercent}%)
            </p>
            <p className="text-xs text-red-500 mt-0.5">Requiere seguimiento inmediato</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Al día ({formatCurrency(onTimeAmount)})</span>
          <span>Vencido</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-blue-400 rounded-l-full transition-all"
            style={{ width: `${100 - overduePercent}%` }}
          />
          <div
            className="h-full bg-red-400 rounded-r-full transition-all"
            style={{ width: `${overduePercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
