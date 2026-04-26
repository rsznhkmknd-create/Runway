'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'

export interface CashFlowDataPoint {
  month: string
  ingresos: number
  gastos: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
  currency: string
}

function CustomTooltip({ active, payload, label, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const ingresos = payload.find((p) => p.dataKey === 'ingresos')?.value ?? 0
  const gastos = payload.find((p) => p.dataKey === 'gastos')?.value ?? 0
  const net = ingresos - gastos

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <p className="mb-2 text-xs font-medium text-text-muted">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full bg-mint" />
            Ingresos
          </span>
          <span className="tabular-nums text-sm font-semibold text-income">
            {formatCurrency(ingresos, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full bg-expense" />
            Gastos
          </span>
          <span className="tabular-nums text-sm font-semibold text-expense">
            {formatCurrency(gastos, currency)}
          </span>
        </div>
        <div className="mt-1.5 border-t border-border pt-1.5">
          <div className="flex items-center justify-between gap-4">
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
        </div>
      </div>
    </div>
  )
}

interface Props {
  data: CashFlowDataPoint[]
  currency: string
}

export default function CashFlowChart({ data, currency }: Props) {
  const hasData = data.some((d) => d.ingresos > 0 || d.gastos > 0)

  const totals = useMemo(() => {
    const totalIngresos = data.reduce((s, d) => s + d.ingresos, 0)
    const totalGastos = data.reduce((s, d) => s + d.gastos, 0)
    return { totalIngresos, totalGastos, neto: totalIngresos - totalGastos }
  }, [data])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Flujo de caja</h3>
          <p className="text-sm text-text-muted">
            Evolución de tus ingresos y gastos en los últimos 6 meses
          </p>
        </div>
      </div>

      {/* Totals strip with legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-mint" />
          <div className="flex flex-col">
            <span className="text-xs text-text-muted">Total ingresos</span>
            <span className="tabular-nums text-sm font-semibold text-income">
              {formatCurrency(totals.totalIngresos, currency)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-expense" />
          <div className="flex flex-col">
            <span className="text-xs text-text-muted">Total gastos</span>
            <span className="tabular-nums text-sm font-semibold text-expense">
              {formatCurrency(totals.totalGastos, currency)}
            </span>
          </div>
        </div>
        <div className="ml-auto rounded-md border border-border bg-card px-3 py-1.5">
          <span className="text-xs text-text-muted">Neto del período</span>
          <span
            className={cn(
              'ml-2 tabular-nums text-sm font-bold',
              totals.neto >= 0 ? 'text-income' : 'text-expense'
            )}
          >
            {totals.neto >= 0 ? '+' : ''}
            {formatCurrency(totals.neto, currency)}
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-text-muted">
            Sin datos suficientes para mostrar el gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00C48C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00C48C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'rgb(var(--chart-axis))' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'rgb(var(--chart-axis))' }}
                tickFormatter={(value) => `${value / 1000}k`}
                width={50}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke="#00C48C"
                strokeWidth={2}
                fill="url(#incomeGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#00C48C' }}
              />
              <Area
                type="monotone"
                dataKey="gastos"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#expenseGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#EF4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
