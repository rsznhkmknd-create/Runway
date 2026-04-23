'use client'

import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  Target,
  Clock,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { formatPeriod } from '@/lib/reports/period'
import type { ReportRow } from '@/lib/reports/types'

type Props = {
  report: ReportRow
}

const SEVERITY: Record<
  'info' | 'warning' | 'danger',
  { classes: string; icon: typeof Info; label: string }
> = {
  info:    { classes: 'bg-blue-50 border-blue-100 text-blue-700',    icon: Info,          label: 'Info'      },
  warning: { classes: 'bg-amber-50 border-amber-100 text-amber-700', icon: AlertCircle,   label: 'Aviso'     },
  danger:  { classes: 'bg-red-50 border-red-100 text-red-700',       icon: AlertTriangle, label: 'Riesgo'    },
}

export default function ReportView({ report }: Props) {
  const c = report.content
  const k = c.kpis
  const period = formatPeriod({ start: report.period_start, end: report.period_end }, report.type)

  const kpiBars = [
    { label: 'Ingresos',   value: k.total_income,   fill: '#00C48C' },
    { label: 'Gastos',     value: k.total_expenses, fill: '#f87171' },
    { label: 'Margen',     value: k.net_margin,     fill: k.net_margin >= 0 ? '#00C48C' : '#f87171' },
    { label: 'Burn mens.', value: k.burn_rate,      fill: '#111827' },
  ]

  const trendsChart = c.trends.map((t) => ({
    name:     t.category,
    current:  t.current,
    previous: t.previous,
  }))

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Nav bar (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/dashboard/reportes"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a reportes
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar PDF
        </button>
      </div>

      {/* Hero — navy block with exec summary */}
      <div className="bg-[#111827] text-white rounded-2xl p-8 print:rounded-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#00C48C] mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          {report.type === 'weekly' ? 'REPORTE SEMANAL' : 'REPORTE MENSUAL'}
          <span className="text-white/40">·</span>
          <span className="text-white/60">{period}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Resumen ejecutivo</h1>
        <p className="text-white/80 text-base leading-relaxed max-w-3xl">
          {c.executive_summary}
        </p>
      </div>

      {/* KPI grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos"
          value={k.total_income}
          delta={k.income_delta_pct}
          currency={c.currency}
          positiveIsGood
        />
        <KpiCard
          label="Gastos"
          value={k.total_expenses}
          delta={k.expense_delta_pct}
          currency={c.currency}
          positiveIsGood={false}
        />
        <KpiCard
          label="Margen neto"
          value={k.net_margin}
          currency={c.currency}
          positiveIsGood
          highlight
        />
        <KpiCard
          label="Burn rate mensual"
          value={k.burn_rate}
          currency={c.currency}
          positiveIsGood={false}
        />
      </section>

      {/* Runway highlight */}
      <section className="bg-surface rounded-2xl border border-border shadow-sm p-6 flex items-center gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            k.runway_months == null
              ? 'bg-brand-50 text-brand-600'
              : k.runway_months < 3
              ? 'bg-red-50 text-red-600'
              : k.runway_months < 6
              ? 'bg-amber-50 text-amber-600'
              : 'bg-brand-50 text-brand-600'
          )}
        >
          <Clock className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Runway</p>
          <p className="text-2xl font-bold text-text-primary">
            {k.runway_months == null
              ? 'Sin quema — runway ilimitado'
              : `${k.runway_months.toFixed(1)} meses`}
          </p>
        </div>
        {k.runway_months != null && k.runway_months < 3 && (
          <span className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-full">
            Crítico — menos de 3 meses
          </span>
        )}
      </section>

      {/* Mini bar chart — KPIs */}
      <section className="bg-surface rounded-2xl border border-border shadow-sm p-6">
        <h2 className="font-semibold text-text-primary mb-5">KPIs del período</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpiBars} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'rgb(var(--chart-axis))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgb(var(--chart-axis))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgb(var(--border-color))',
                  background: 'rgb(var(--surface))',
                  color: 'rgb(var(--text-primary))',
                  fontSize: 12,
                }}
                formatter={(v: number) => formatCurrency(v, c.currency)}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {kpiBars.map((b, i) => (
                  <Cell key={i} fill={b.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Trends */}
      {trendsChart.length > 0 && (
        <section className="bg-surface rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-text-primary">Tendencias por categoría</h2>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00C48C]" /> Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Anterior
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsChart} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'rgb(var(--chart-axis))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgb(var(--chart-axis))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid rgb(var(--border-color))', background: 'rgb(var(--surface))', color: 'rgb(var(--text-primary))', fontSize: 12 }}
                  formatter={(v: number) => formatCurrency(v, c.currency)}
                />
                <Bar dataKey="previous" fill="#d1d5db" radius={[6, 6, 0, 0]} />
                <Bar dataKey="current"  fill="#00C48C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 space-y-2">
            {c.trends.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t.category}</span>
                <span className={cn(
                  'inline-flex items-center gap-1 font-semibold',
                  t.delta_pct > 0 ? 'text-red-600' : 'text-brand-700'
                )}>
                  {t.delta_pct > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {t.delta_pct > 0 ? '+' : ''}
                  {t.delta_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top income / top expenses */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopList
          title="Top 3 fuentes de ingreso"
          items={c.top_income_sources}
          currency={c.currency}
          accent="income"
        />
        <TopList
          title="Top 3 gastos"
          items={c.top_expenses}
          currency={c.currency}
          accent="expense"
        />
      </section>

      {/* Alerts */}
      {c.alerts.length > 0 && (
        <section>
          <h2 className="font-semibold text-text-primary mb-3">Alertas y riesgos</h2>
          <div className="space-y-2">
            {c.alerts.map((a, i) => {
              const s = SEVERITY[a.severity]
              const Icon = s.icon
              return (
                <div
                  key={i}
                  className={cn('flex items-start gap-3 border rounded-xl px-4 py-3', s.classes)}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed">{a.message}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {c.recommendations.length > 0 && (
        <section className="bg-[#0F1D2D] text-white rounded-2xl p-6 print:rounded-none">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#00C48C]" />
            <h2 className="font-semibold text-white">Recomendaciones</h2>
          </div>
          <ol className="space-y-3">
            {c.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#00C48C]/20 text-[#00C48C] text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-white/90 text-sm leading-relaxed">{rec}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Projection */}
      <section className="bg-surface rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-text-primary">Proyección a 30 días</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <ProjectionCell
            label="Ingresos estimados"
            value={c.projection_30d.expected_income}
            currency={c.currency}
            positive
          />
          <ProjectionCell
            label="Gastos estimados"
            value={c.projection_30d.expected_expenses}
            currency={c.currency}
          />
          <ProjectionCell
            label="Neto estimado"
            value={c.projection_30d.expected_net}
            currency={c.currency}
            positive={c.projection_30d.expected_net >= 0}
            highlight
          />
        </div>
        {c.projection_30d.notes && (
          <p className="text-xs text-text-muted mt-4 leading-relaxed">{c.projection_30d.notes}</p>
        )}
      </section>
    </div>
  )
}

function KpiCard({
  label, value, delta, currency, positiveIsGood, highlight,
}: {
  label: string
  value: number
  delta?: number
  currency: string
  positiveIsGood: boolean
  highlight?: boolean
}) {
  const deltaColor =
    delta == null
      ? ''
      : (delta > 0) === positiveIsGood
      ? 'text-brand-700'
      : 'text-red-600'

  return (
    <div
      className={cn(
        'rounded-2xl p-5 border',
        highlight
          ? 'bg-brand-50 border-brand-100'
          : 'bg-surface border-border shadow-sm'
      )}
    >
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'text-xl font-bold mt-2',
          highlight ? 'text-brand-800' : 'text-text-primary'
        )}
      >
        {formatCurrency(value, currency)}
      </p>
      {delta != null && (
        <p className={cn('text-xs font-semibold mt-1.5', deltaColor)}>
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}% vs período anterior
        </p>
      )}
    </div>
  )
}

function TopList({
  title, items, currency, accent,
}: {
  title: string
  items: { name: string; amount: number }[]
  currency: string
  accent: 'income' | 'expense'
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
      <h3 className="font-semibold text-text-primary mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Sin datos suficientes.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={cn(
                'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0',
                accent === 'income'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-red-50 text-red-700'
              )}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-text-primary truncate">{item.name}</span>
              <span
                className={cn(
                  'text-sm font-semibold whitespace-nowrap',
                  accent === 'income' ? 'text-brand-700' : 'text-text-primary'
                )}
              >
                {formatCurrency(item.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProjectionCell({
  label, value, currency, positive, highlight,
}: {
  label: string
  value: number
  currency: string
  positive?: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'text-lg font-bold mt-1.5',
          highlight
            ? positive
              ? 'text-brand-700'
              : 'text-red-600'
            : 'text-text-primary'
        )}
      >
        {formatCurrency(value, currency)}
      </p>
    </div>
  )
}
