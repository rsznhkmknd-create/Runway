import { formatCurrency } from '@/lib/utils'

interface Props {
  total: number
  overdue: number
  count: number
  currency: string
}

export default function AccountsReceivableCard({ total, overdue, count, currency }: Props) {
  const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">Por cobrar</p>
        <span className="text-xs font-medium text-text-muted tabular-nums">
          {count} {count === 1 ? 'factura' : 'facturas'}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
          {formatCurrency(total, currency)}
        </span>
      </div>
      <p className="text-xs text-text-muted mt-1.5">
        Pendiente de cobro
      </p>

      {overdue > 0 ? (
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-muted">Vencido</span>
          <span className="text-xs font-semibold text-red-500 tabular-nums">
            {formatCurrency(overdue, currency)} · {overduePercent}%
          </span>
        </div>
      ) : total > 0 ? (
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-muted">Todo al día</span>
          <span className="text-xs font-semibold text-brand-600">0 vencidas</span>
        </div>
      ) : null}
    </div>
  )
}
