'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import clsx, { type ClassValue } from 'clsx'
import { BentoCard } from './bento-card'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Trend = 'up' | 'down' | 'flat'

type AnimatedKpiCardProps = {
  label: string
  /** numeric value to count up to (set `formatted` to override display) */
  value: number
  /** pre-formatted display (e.g. "€12.340") — if set, no count-up */
  formatted?: string
  /** suffix like "meses", "€" — only used if `formatted` is not set */
  suffix?: string
  /** prefix like "€" */
  prefix?: string
  /** trend delta percentage (e.g. +12, -4) */
  trendPct?: number
  /** forces trend direction regardless of sign (e.g. for runway where down = bad) */
  trend?: Trend
  icon?: LucideIcon
  hint?: string
  accent?: 'mint' | 'navy'
  delay?: number
  className?: string
  /** fraction digits for count-up */
  decimals?: number
  children?: ReactNode
}

function formatNumber(n: number, decimals: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function useCountUp(target: number, duration = 1200, decimals = 0) {
  const [val, setVal] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    setVal(0)
    start.current = null
    const step = (ts: number) => {
      if (start.current == null) start.current = ts
      const elapsed = ts - start.current
      const t = Math.min(elapsed / duration, 1)
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setVal(eased * target)
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration, decimals])

  return formatNumber(val, decimals)
}

export function AnimatedKpiCard({
  label,
  value,
  formatted,
  suffix,
  prefix,
  trendPct,
  trend,
  icon: Icon,
  hint,
  accent = 'navy',
  delay = 0,
  className,
  decimals = 0,
  children,
}: AnimatedKpiCardProps) {
  const count = useCountUp(value, 1100, decimals)
  const display = formatted ?? `${prefix ?? ''}${count}${suffix ? ` ${suffix}` : ''}`

  const effectiveTrend: Trend =
    trend ?? (trendPct == null ? 'flat' : trendPct > 0 ? 'up' : trendPct < 0 ? 'down' : 'flat')

  const trendColor =
    effectiveTrend === 'up'
      ? 'text-brand-600 bg-brand-600/10 border-brand-500/20'
      : effectiveTrend === 'down'
        ? 'text-red-500 bg-red-500/10 border-red-500/20'
        : 'text-text-muted bg-surface-2 border-border'

  const TrendIcon =
    effectiveTrend === 'up' ? ArrowUpRight : effectiveTrend === 'down' ? ArrowDownRight : Minus

  return (
    <BentoCard delay={delay} accent className={cn('p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                accent === 'mint'
                  ? 'bg-brand-600/10 text-brand-600 border border-brand-500/20'
                  : 'bg-surface-2 text-text-secondary border border-border'
              )}
            >
              <Icon className="w-[15px] h-[15px]" strokeWidth={2} />
            </div>
          )}
          <span className="text-[12px] font-medium text-text-muted tracking-tight">{label}</span>
        </div>
        {trendPct != null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold',
              trendColor
            )}
          >
            <TrendIcon className="w-3 h-3" strokeWidth={2.5} />
            {trendPct > 0 ? '+' : ''}
            {trendPct}%
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-text-primary tabular-nums leading-none">
          {display}
        </span>
      </div>

      {hint && (
        <p className="mt-2.5 text-[12px] text-text-muted leading-relaxed">{hint}</p>
      )}

      {children}
    </BentoCard>
  )
}
