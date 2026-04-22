'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export interface CashFlowDataPoint {
  month: string
  ingresos: number
  gastos: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data: CashFlowDataPoint[]
}

export default function CashFlowChart({ data }: Props) {
  const hasData = data.some((d) => d.ingresos > 0 || d.gastos > 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-gray-900">Flujo de Caja</h2>
          <p className="text-xs text-gray-400 mt-0.5">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />
            Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            Gastos
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
          Sin datos suficientes para mostrar el gráfico
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C48C" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#00C48C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="#00C48C"
              strokeWidth={2}
              fill="url(#colorIngresos)"
              dot={false}
              activeDot={{ r: 4, fill: '#00C48C' }}
            />
            <Area
              type="monotone"
              dataKey="gastos"
              stroke="#f87171"
              strokeWidth={2}
              fill="url(#colorGastos)"
              dot={false}
              activeDot={{ r: 4, fill: '#f87171' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
