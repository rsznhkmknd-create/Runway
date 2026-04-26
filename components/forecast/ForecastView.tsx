'use client'

import { useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react'
import {
  computeForecast,
  type ForecastTx,
  type Scenario,
} from '@/lib/forecast/compute'
import { cn, formatCurrency } from '@/lib/utils'
import ForecastChart from './ForecastChart'

interface Props {
  /** Already-fetched transactions from the server (last ~24 months is plenty). */
  transactions: ForecastTx[]
  currency: string
}

const SCENARIO_OPTIONS: { value: Scenario; label: string; hint: string }[] = [
  { value: 'conservative', label: 'Conservador', hint: '−20% sobre la tendencia' },
  { value: 'realistic',    label: 'Realista',    hint: 'Tendencia actual' },
  { value: 'optimistic',   label: 'Optimista',   hint: '+20% sobre la tendencia' },
]

export default function ForecastView({ transactions, currency }: Props) {
  const [scenario, setScenario] = useState<Scenario>('realistic')
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Recompute forecast on every scenario change. Pure math, sub-millisecond.
  const forecast = useMemo(
    () => computeForecast(transactions, scenario),
    [transactions, scenario]
  )

  async function runAnalysis() {
    if (analyzing) return
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/forecast/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenario: forecast.scenario,
          startingCash: forecast.startingCash,
          avgIncome3m: forecast.avgIncome3m,
          avgExpense3m: forecast.avgExpense3m,
          baselineGrowthRate: forecast.baselineGrowthRate,
          appliedGrowthRate: forecast.appliedGrowthRate,
          totalIncome12m: forecast.kpis.totalIncome12m,
          totalExpense12m: forecast.kpis.totalExpense12m,
          cashAtMonth12: forecast.kpis.cashAtMonth12,
          breakEvenMonth: forecast.kpis.breakEvenMonth,
          currency,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { analysis: string }
      setAnalysis(data.analysis)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setAnalyzing(false)
    }
  }

  const breakEven = forecast.kpis.breakEvenMonth

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Forecast 12 meses
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Proyección basada en los últimos 3 meses de tus transacciones.
            Cambia de escenario para ver el impacto de un crecimiento mayor o menor.
          </p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyzing}
          className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-mint-dark active:scale-[0.97] disabled:opacity-50"
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {analyzing ? 'Analizando…' : 'Analizar con IA'}
        </button>
      </div>

      {/* ── Break-even alert (only when projection hits 0) ──────────── */}
      {breakEven && (
        <div className="flex items-start gap-3 rounded-xl border border-expense/30 bg-expense/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-expense mt-0.5" />
          <div className="text-sm text-expense">
            <p className="font-semibold">
              A este ritmo, tu caja se agota en {breakEven.label}.
            </p>
            <p className="mt-0.5 text-expense/80 text-xs">
              (mes {breakEven.monthIndex} del forecast — escenario {forecast.scenario})
            </p>
          </div>
        </div>
      )}

      {/* ── Scenario switcher ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Escenario
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SCENARIO_OPTIONS.map((opt) => {
            const active = scenario === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScenario(opt.value)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-all duration-200 active:scale-[0.98]',
                  active
                    ? 'border-mint bg-mint/10'
                    : 'border-border bg-background hover:border-mint/40 hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    active ? 'text-mint' : 'text-text-primary'
                  )}
                >
                  {opt.label}
                </span>
                <span className="text-xs text-text-muted">{opt.hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Ingresos proy. (12m)"
          value={formatCurrency(forecast.kpis.totalIncome12m, currency)}
          hint={`crec. mensual ${(forecast.appliedGrowthRate * 100).toFixed(1)}%`}
        />
        <KpiCard
          icon={TrendingDown}
          label="Gastos proy. (12m)"
          value={formatCurrency(forecast.kpis.totalExpense12m, currency)}
          hint={`media mensual ${formatCurrency(forecast.avgExpense3m, currency)}`}
        />
        <KpiCard
          icon={Wallet}
          label="Caja proy. al mes 12"
          value={formatCurrency(forecast.kpis.cashAtMonth12, currency)}
          hint={`hoy ${formatCurrency(forecast.startingCash, currency)}`}
          tone={forecast.kpis.cashAtMonth12 < 0 ? 'danger' : forecast.kpis.cashAtMonth12 < forecast.startingCash ? 'warn' : 'ok'}
        />
        <KpiCard
          icon={AlertCircle}
          label="Break-even"
          value={breakEven ? breakEven.label : 'No aplica'}
          hint={breakEven ? `mes ${breakEven.monthIndex}` : 'caja > 0 en 12m'}
          tone={breakEven ? 'danger' : 'ok'}
        />
      </div>

      {/* ── Chart ───────────────────────────────────────────────────── */}
      <ForecastChart forecast={forecast} currency={currency} />

      {/* ── AI analysis output ──────────────────────────────────────── */}
      {(analysis || analysisError) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-mint/10">
              <Sparkles className="h-3.5 w-3.5 text-mint" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-text-primary">
              Análisis CFO
            </h3>
          </div>
          {analysisError ? (
            <p className="text-sm text-expense">{analysisError}</p>
          ) : (
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {analysis}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── KPI card primitive (local to forecast view) ─────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'ok',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
  tone?: 'ok' | 'warn' | 'danger'
}) {
  const accent =
    tone === 'danger'
      ? 'bg-expense'
      : tone === 'warn'
        ? 'bg-amber'
        : 'bg-mint'
  const iconBg =
    tone === 'danger'
      ? 'bg-expense/10 text-expense'
      : tone === 'warn'
        ? 'bg-amber/10 text-amber'
        : 'bg-mint/10 text-mint'

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-mint/20">
      <div className={cn('absolute left-0 right-0 top-0 h-0.5', accent)} />
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="tabular-nums text-2xl font-bold tracking-tight text-text-primary truncate">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105 shrink-0',
            iconBg
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-text-muted">{hint}</p>
    </div>
  )
}
