'use client'

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import type { ForecastResult, MonthBucket } from '@/lib/forecast/compute'

interface Props {
  forecast: ForecastResult
  currency: string
}

/**
 * Combine history (6) + projection (12) into a single 18-row dataset.
 * Each row carries 5 series so we can render history with solid strokes
 * and projection with dashed strokes via two separate Area pairs.
 *
 * The boundary trick: the LAST history row also publishes the projection
 * series with the same income/expense values it has as history, so the
 * projected lines start exactly where the historical ones end (no gap).
 */
function buildChartData(forecast: ForecastResult): ChartRow[] {
  const rows: ChartRow[] = []
  const history = forecast.history
  const projection = forecast.projection

  for (let i = 0; i < history.length; i++) {
    const h = history[i]!
    const isLast = i === history.length - 1
    rows.push({
      label: h.label,
      // Solid (historical) series
      historicalIncome: h.income,
      historicalExpense: h.expense,
      // Bridge: also seed projection series at the boundary so the dashed
      // line picks up exactly where the solid one finishes.
      projectedIncome: isLast ? h.income : null,
      projectedExpense: isLast ? h.expense : null,
      projectedCash: isLast ? forecast.startingCash : null,
      isProjection: false,
    })
  }
  for (const p of projection) {
    rows.push({
      label: p.label,
      historicalIncome: null,
      historicalExpense: null,
      projectedIncome: p.income,
      projectedExpense: p.expense,
      projectedCash: p.cash,
      isProjection: true,
    })
  }
  return rows
}

type ChartRow = {
  label: string
  historicalIncome: number | null
  historicalExpense: number | null
  projectedIncome: number | null
  projectedExpense: number | null
  projectedCash: number | null
  isProjection: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; payload: ChartRow }>
  label?: string
  currency: string
}

function CustomTooltip({ active, payload, label, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0]!.payload
  // Pick whichever series has a value (history XOR projection per row).
  const income = row.historicalIncome ?? row.projectedIncome ?? 0
  const expense = row.historicalExpense ?? row.projectedExpense ?? 0
  const cash = row.projectedCash
  const net = income - expense

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg min-w-[180px]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-text-muted capitalize">{label}</p>
        {row.isProjection && (
          <span className="text-[10px] font-semibold tracking-wide text-text-muted uppercase">
            proyección
          </span>
        )}
      </div>
      <div className="space-y-1">
        <Row dot="bg-mint" label="Ingresos" value={income} currency={currency} colorClass="text-income" />
        <Row dot="bg-expense" label="Gastos" value={expense} currency={currency} colorClass="text-expense" />
        <div className="border-t border-border pt-1.5 flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-text-muted">Neto</span>
          <span
            className={cn(
              'tabular-nums text-sm font-bold',
              net >= 0 ? 'text-income' : 'text-expense'
            )}
          >
            {net >= 0 ? '+' : ''}
            {formatCurrency(net, currency)}
          </span>
        </div>
        {cash != null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="h-2 w-2 rounded-full bg-mint-dark" />
              Caja proy.
            </span>
            <span
              className={cn(
                'tabular-nums text-sm font-semibold',
                cash > 0 ? 'text-text-primary' : 'text-expense'
              )}
            >
              {formatCurrency(cash, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  dot,
  label,
  value,
  currency,
  colorClass,
}: {
  dot: string
  label: string
  value: number
  currency: string
  colorClass: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        <span className={cn('h-2 w-2 rounded-full', dot)} />
        {label}
      </span>
      <span className={cn('tabular-nums text-sm font-semibold', colorClass)}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  )
}

export default function ForecastChart({ forecast, currency }: Props) {
  const data = buildChartData(forecast)
  // The "Hoy" reference line sits AT the boundary, i.e. on the last
  // historical row's label (which is also bridged into the projection).
  const historyEndLabel = forecast.history[forecast.history.length - 1]?.label

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Forecast 12 meses
          </h3>
          <p className="text-sm text-text-muted">
            Histórico (últimos 6 meses) y proyección (próximos 12)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-mint" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-expense" /> Gastos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-mint-dark" /> Caja proy.
          </span>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C48C" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#00C48C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="rgb(var(--chart-grid))"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'rgb(var(--chart-axis))' }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'rgb(var(--chart-axis))' }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              width={50}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />

            {/* "Hoy" separator between history and projection */}
            {historyEndLabel && (
              <ReferenceLine
                x={historyEndLabel}
                stroke="rgb(var(--text-muted))"
                strokeDasharray="4 4"
                label={{
                  value: 'Hoy',
                  position: 'top',
                  fill: 'rgb(var(--text-muted))',
                  fontSize: 11,
                }}
              />
            )}

            {/* Historical income/expense — solid */}
            <Area
              type="monotone"
              dataKey="historicalIncome"
              stroke="#00C48C"
              strokeWidth={2}
              fill="url(#forecastIncomeGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#00C48C' }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="historicalExpense"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#forecastExpenseGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#EF4444' }}
              connectNulls={false}
            />

            {/* Projected income/expense — dashed */}
            <Area
              type="monotone"
              dataKey="projectedIncome"
              stroke="#00C48C"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#forecastIncomeGradient)"
              fillOpacity={0.55}
              dot={false}
              activeDot={{ r: 4, fill: '#00C48C' }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="projectedExpense"
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#forecastExpenseGradient)"
              fillOpacity={0.55}
              dot={false}
              activeDot={{ r: 4, fill: '#EF4444' }}
              connectNulls={false}
            />

            {/* Projected cash line — solid darker mint, no fill */}
            <Line
              type="monotone"
              dataKey="projectedCash"
              stroke="#00A67E"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#00A67E' }}
              activeDot={{ r: 5, fill: '#00A67E' }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
