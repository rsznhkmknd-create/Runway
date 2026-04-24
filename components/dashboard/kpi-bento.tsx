'use client'

import { TrendingUp, Flame, FileText } from 'lucide-react'
import { AnimatedKpiCard } from './animated-kpi-card'

type KpiBentoProps = {
  runway: { months: number; trend: number; cashBalance: number }
  burnRate: { monthly: number; trend: number; prevMonthly: number }
  receivable: { total: number; overdue: number; count: number }
  currency?: string
}

function fmtCurrency(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

/**
 * Bento grid of KPI cards — sizing chosen to mirror Linear/Stripe dashboards:
 * runway gets the hero slot (2 cols wide on lg), burn + receivable share the row.
 */
export function KpiBento({ runway, burnRate, receivable, currency = 'EUR' }: KpiBentoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
      {/* Runway — hero card, spans 3 on large */}
      <AnimatedKpiCard
        className="md:col-span-3 lg:col-span-3"
        label="Runway"
        value={runway.months}
        suffix={runway.months === 1 ? 'mes' : 'meses'}
        trendPct={runway.trend}
        icon={TrendingUp}
        accent="mint"
        delay={0}
        hint={`Caja actual: ${fmtCurrency(runway.cashBalance, currency)}`}
      >
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-[1600ms]"
            style={{
              width: `${Math.min(Math.max(runway.months * 6, 6), 100)}%`,
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </AnimatedKpiCard>

      {/* Burn rate */}
      <AnimatedKpiCard
        className="md:col-span-3 lg:col-span-3"
        label="Burn rate (este mes)"
        value={burnRate.monthly}
        formatted={fmtCurrency(burnRate.monthly, currency)}
        trendPct={burnRate.trend}
        icon={Flame}
        delay={120}
        hint={`Mes anterior: ${fmtCurrency(burnRate.prevMonthly, currency)}`}
      />

      {/* Cuentas por cobrar — full-width secondary row */}
      <AnimatedKpiCard
        className="md:col-span-3 lg:col-span-4"
        label="Cuentas por cobrar"
        value={receivable.total}
        formatted={fmtCurrency(receivable.total, currency)}
        icon={FileText}
        delay={240}
        hint={`${receivable.count} ${receivable.count === 1 ? 'factura pendiente' : 'facturas pendientes'}${
          receivable.overdue > 0 ? ` · ${fmtCurrency(receivable.overdue, currency)} vencidas` : ''
        }`}
      />

      {/* Resumen proactivo */}
      <AnimatedKpiCard
        className="md:col-span-3 lg:col-span-2"
        label="Estado"
        value={0}
        formatted={runway.months >= 6 ? 'Saludable' : runway.months >= 3 ? 'Vigilar' : 'Crítico'}
        trend={runway.months >= 6 ? 'up' : runway.months >= 3 ? 'flat' : 'down'}
        trendPct={runway.trend}
        delay={360}
        hint={
          runway.months >= 6
            ? 'Caja cómoda para planificar'
            : runway.months >= 3
              ? 'Momento de afinar gastos'
              : 'Prioridad: entrar ingresos'
        }
      />
    </div>
  )
}
