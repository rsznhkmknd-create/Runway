import { Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface Props {
  months: number
  trend: number
  cashBalance: number
  currency: string
}

type HealthStatus = 'saludable' | 'en-riesgo' | 'critico'

function getHealthStatus(months: number): HealthStatus {
  if (months >= 12) return 'saludable'
  if (months >= 6) return 'en-riesgo'
  return 'critico'
}

const healthConfig: Record<HealthStatus, { label: string; className: string }> = {
  saludable:    { label: 'Saludable',  className: 'bg-income/10 text-income border-income/20' },
  'en-riesgo':  { label: 'En riesgo',  className: 'bg-amber/10 text-amber border-amber/20' },
  critico:      { label: 'Crítico',    className: 'bg-expense/10 text-expense border-expense/20' },
}

export default function RunwayCard({ months, trend, cashBalance, currency }: Props) {
  const positive = trend >= 0
  const Arrow = positive ? TrendingUp : TrendingDown
  const health = healthConfig[getHealthStatus(months)]

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-mint/20">
      {/* Mint accent line */}
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-mint" />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-text-muted">Runway</p>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                health.className
              )}
            >
              {health.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="tabular-nums text-3xl font-bold tracking-tight text-text-primary">
              {months}
            </span>
            <span className="text-sm font-medium text-text-muted">
              {months === 1 ? 'mes' : 'meses'}
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint/10 transition-transform duration-300 group-hover:scale-105">
          <Clock className="h-5 w-5 text-mint" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {trend !== 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              positive ? 'text-income' : 'text-expense'
            )}
          >
            <Arrow className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
        )}
        <span className="text-xs text-text-muted">
          Saldo{' '}
          <span className="font-medium text-text-secondary tabular-nums">
            {formatCurrency(cashBalance, currency)}
          </span>
        </span>
      </div>
    </div>
  )
}
