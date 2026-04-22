'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  CalendarDays,
  FileBarChart,
  Loader2,
  Sparkles,
  AlertCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPeriod } from '@/lib/reports/period'
import type { ReportRow, ReportType } from '@/lib/reports/types'

type Props = {
  initialReports: ReportRow[]
}

export default function ReportsClient({ initialReports }: Props) {
  const router = useRouter()
  const [reports, setReports] = useState<ReportRow[]>(initialReports)
  const [busy, setBusy] = useState<ReportType | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const generate = async (type: ReportType) => {
    setBusy(type)
    setError('')
    try {
      const res = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al generar el reporte')
      const newReport = json.report as ReportRow
      startTransition(() => router.push(`/dashboard/reportes/${newReport.id}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte')
      setBusy(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este reporte?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (res.ok) setReports((r) => r.filter((x) => x.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes con IA</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Análisis financiero generado por Claude como si tuvieras un CFO fraccional
        </p>
      </div>

      {/* Generate cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GenerateCard
          type="weekly"
          title="Reporte semanal"
          subtitle="Últimos 7 días"
          description="Análisis de la última semana: movimientos, tendencias y alertas tempranas."
          Icon={Calendar}
          busy={busy === 'weekly'}
          disabled={busy !== null}
          onGenerate={() => generate('weekly')}
        />
        <GenerateCard
          type="monthly"
          title="Reporte mensual"
          subtitle="Últimos 30 días"
          description="Visión completa del mes: KPIs, runway, proyecciones y recomendaciones."
          Icon={CalendarDays}
          busy={busy === 'monthly'}
          disabled={busy !== null}
          onGenerate={() => generate('monthly')}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">Historial de reportes</h2>
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-8 py-16 text-center">
            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
              <FileBarChart className="w-6 h-6 text-brand-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">Aún no has generado reportes</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Genera tu primer reporte semanal o mensual para ver un análisis detallado de tu negocio.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {reports.map((r) => {
                const period = formatPeriod({ start: r.period_start, end: r.period_end }, r.type)
                const isBusyRow = deleting === r.id
                return (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      r.type === 'weekly' ? 'bg-amber-50' : 'bg-brand-50'
                    )}>
                      {r.type === 'weekly' ? (
                        <Calendar className="w-5 h-5 text-amber-600" />
                      ) : (
                        <CalendarDays className="w-5 h-5 text-brand-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {r.type === 'weekly' ? 'Reporte semanal' : 'Reporte mensual'}
                        </p>
                        <span className="text-xs text-gray-400">·</span>
                        <p className="text-xs text-gray-500 truncate">{period}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Generado {new Date(r.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/reportes/${r.id}`}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                    >
                      Ver reporte
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={isBusyRow}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function GenerateCard({
  title,
  subtitle,
  description,
  Icon,
  busy,
  disabled,
  onGenerate,
}: {
  type:     ReportType
  title:    string
  subtitle: string
  description: string
  Icon: typeof Calendar
  busy: boolean
  disabled: boolean
  onGenerate: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-6 flex-1">{description}</p>
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generar reporte
          </>
        )}
      </button>
    </div>
  )
}
