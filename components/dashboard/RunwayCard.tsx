import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface Props {
  months: number
  trend: number
  cashBalance: number
}

export default function RunwayCard({ months, trend, cashBalance }: Props) {
  const positive = trend >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">Runway</p>
        {trend !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold',
              positive ? 'text-brand-600' : 'text-red-500'
            )}
          >
            <Arrow className="w-3.5 h-3.5" />
            {positive ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
          {months}
        </span>
        <span className="text-sm font-medium text-text-muted">meses</span>
      </div>
      <p className="text-xs text-text-muted mt-1.5">
        Saldo{' '}
        <span className="text-text-secondary font-medium tabular-nums">
          {formatCurrency(cashBalance)}
        </span>
      </p>

      {/* Minimal progress indicator — Linear-style, 1px high */}
      <div className="mt-6 h-0.5 w-full bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full"
          style={{ width: `${Math.min((months / 24) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
