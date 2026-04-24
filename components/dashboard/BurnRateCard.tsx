import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface CategoryStat {
  label: string
  amount: number
}

interface Props {
  monthly: number
  trend: number
  prevMonthly: number
  topCategories?: CategoryStat[]
  currency: string
}

export default function BurnRateCard({
  monthly,
  trend,
  prevMonthly,
  topCategories = [],
  currency,
}: Props) {
  // For burn rate, lower is better — so negative trend is "good".
  const improved = trend <= 0
  const Arrow = trend > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">Burn rate</p>
        {trend !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold',
              improved ? 'text-brand-600' : 'text-red-500'
            )}
          >
            <Arrow className="w-3.5 h-3.5" />
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
          {formatCurrency(monthly, currency)}
        </span>
        <span className="text-sm font-medium text-text-muted">/mes</span>
      </div>
      <p className="text-xs text-text-muted mt-1.5">
        Mes anterior{' '}
        <span className="text-text-secondary font-medium tabular-nums">
          {formatCurrency(prevMonthly, currency)}
        </span>
      </p>

      {topCategories.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border space-y-2">
          {topCategories.slice(0, 2).map((cat) => (
            <div
              key={cat.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-text-muted truncate">{cat.label}</span>
              <span className="font-semibold text-text-primary tabular-nums">
                {formatCurrency(cat.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
