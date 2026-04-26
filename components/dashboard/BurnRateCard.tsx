import { Flame, TrendingUp, TrendingDown } from 'lucide-react'
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
  // For burn rate, lower is better — negative trend is "good" (color income).
  const improved = trend <= 0
  const Arrow = trend > 0 ? TrendingUp : TrendingDown

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-mint/20">
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-mint" />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-muted">Burn rate</p>
          <div className="flex items-baseline gap-1">
            <span className="tabular-nums text-3xl font-bold tracking-tight text-text-primary">
              {formatCurrency(monthly, currency)}
            </span>
            <span className="text-sm font-medium text-text-muted">/mes</span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint/10 transition-transform duration-300 group-hover:scale-105">
          <Flame className="h-5 w-5 text-mint" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {trend !== 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              improved ? 'text-income' : 'text-expense'
            )}
          >
            <Arrow className="h-3 w-3" />
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
        )}
        <span className="text-xs text-text-muted">
          mes anterior{' '}
          <span className="font-medium text-text-secondary tabular-nums">
            {formatCurrency(prevMonthly, currency)}
          </span>
        </span>
      </div>

      {topCategories.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
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
