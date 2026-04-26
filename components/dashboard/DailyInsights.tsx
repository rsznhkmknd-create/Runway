'use client'

import { useEffect, useState } from 'react'
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import type { Insight, InsightSeverity } from '@/lib/insights/types'

type Response = {
  insights: Insight[]
  hasData:  boolean
  cached:   boolean
}

type Props = {
  /** If the server already found cached insights, it passes them here to
   *  skip the client fetch. null means "we don't know yet — go fetch". */
  initial: Response | null
}

const SEVERITY: Record<
  InsightSeverity,
  { Icon: typeof CheckCircle2; color: string; bar: string; title: string }
> = {
  positive: {
    Icon: CheckCircle2,
    color: 'text-income',
    bar: 'bg-income',
    title: 'Bien',
  },
  warning: {
    Icon: AlertTriangle,
    color: 'text-amber',
    bar: 'bg-amber',
    title: 'Vigilar',
  },
  critical: {
    Icon: AlertCircle,
    color: 'text-expense',
    bar: 'bg-expense',
    title: 'Atención',
  },
}

export default function DailyInsights({ initial }: Props) {
  const [data, setData]       = useState<Response | null>(initial)
  const [loading, setLoading] = useState<boolean>(initial === null)
  const [error, setError]     = useState<string>('')

  useEffect(() => {
    if (data !== null) return // we already have a result
    let cancelled = false
    ;(async () => {
      try {
        const json = await fetchJson<Response>('/api/insights/today', {
          timeoutMs: 45_000,
        })
        if (!cancelled) setData(json)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof FetchJsonError
            ? err.kind === 'timeout'
              ? 'Generar insights tomó demasiado. Recarga para reintentar.'
              : err.message
            : 'No se pudieron cargar los insights.'
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [data])

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-mint/10">
          <Zap className="h-3.5 w-3.5 text-mint" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Insights de hoy</h3>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card p-4">
          <InsightsSkeleton />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && data && !data.hasData && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Importa tus primeros datos para ver insights personalizados.
          </p>
          <Link
            href="/dashboard/importar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint hover:text-mint-dark transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </Link>
        </div>
      )}

      {!loading && !error && data && data.hasData && data.insights.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-text-secondary">
            Sin novedades relevantes hoy. Vuelve mañana.
          </p>
        </div>
      )}

      {!loading && !error && data && data.insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const { Icon, color, bar, title } = SEVERITY[insight.severity]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80 + index * 140)
    return () => clearTimeout(id)
  }, [index])

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-mint/20"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        filter: visible ? 'blur(0)' : 'blur(4px)',
        transition:
          'opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 500ms cubic-bezier(0.22,1,0.36,1), filter 500ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Colored left border per severity */}
      <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', bar)} />

      <div className="pl-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} strokeWidth={2.5} />
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          {insight.message}
        </p>
      </div>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>Analizando tus números…</span>
    </div>
  )
}
