import { FileText } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface Props {
  total: number
  overdue: number
  count: number
  currency: string
}

export default function AccountsReceivableCard({ total, overdue, count, currency }: Props) {
  const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-mint/20">
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-mint" />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-muted">Por cobrar</p>
          <div className="flex items-baseline gap-1">
            <span className="tabular-nums text-3xl font-bold tracking-tight text-text-primary">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint/10 transition-transform duration-300 group-hover:scale-105">
          <FileText className="h-5 w-5 text-mint" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-text-muted">
          {count} {count === 1 ? 'factura pendiente' : 'facturas pendientes'}
        </span>
        {overdue > 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium text-expense'
            )}
          >
            · {formatCurrency(overdue, currency)} vencidas ({overduePercent}%)
          </span>
        )}
        {overdue === 0 && total > 0 && (
          <span className="text-xs font-medium text-income">· todo al día</span>
        )}
      </div>
    </div>
  )
}
