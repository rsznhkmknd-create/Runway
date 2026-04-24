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
  { Icon: typeof CheckCircle2; color: string }
> = {
  positive: { Icon: CheckCircle2,   color: 'text-brand-600' },
  warning:  { Icon: AlertTriangle,  color: 'text-amber-500' },
  critical: { Icon: AlertCircle,    color: 'text-red-500'   },
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
    <section className="rounded-xl border border-border bg-surface-2/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-brand-600" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-text-primary tracking-tight">
          Insights de hoy
        </h2>
      </div>

      {loading && <InsightsSkeleton />}

      {!loading && error && (
        <p className="text-sm text-text-secondary">{error}</p>
      )}

      {!loading && !error && data && !data.hasData && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Importa tus primeros datos para ver insights personalizados.
          </p>
          <Link
            href="/dashboard/importar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </Link>
        </div>
      )}

      {!loading && !error && data && data.hasData && data.insights.length === 0 && (
        <p className="text-sm text-text-secondary">
          Sin novedades relevantes hoy. Vuelve mañana.
        </p>
      )}

      {!loading && !error && data && data.insights.length > 0 && (
        <ul className="space-y-3">
          {data.insights.map((insight, i) => (
            <InsightRow key={i} insight={insight} index={i} />
          ))}
        </ul>
      )}
    </section>
  )
}

function InsightRow({ insight, index }: { insight: Insight; index: number }) {
  const { Icon, color } = SEVERITY[insight.severity]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80 + index * 140)
    return () => clearTimeout(id)
  }, [index])

  return (
    <li
      className="flex items-start gap-3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        filter: visible ? 'blur(0)' : 'blur(4px)',
        transition:
          'opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 500ms cubic-bezier(0.22,1,0.36,1), filter 500ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <Icon
        className={cn('w-4 h-4 mt-0.5 shrink-0', color)}
        strokeWidth={2}
      />
      <p className="text-sm text-text-primary leading-relaxed flex-1">
        {insight.message}
      </p>
    </li>
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
