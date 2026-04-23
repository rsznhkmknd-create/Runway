'use client'

import { CheckCircle2, Bell, CheckCheck } from 'lucide-react'
import { useAlerts } from './AlertsProvider'
import AlertCard from './AlertCard'

export default function AlertsList() {
  const { alerts, unreadCount, markAllRead } = useAlerts()

  // Order: unread first (critical → warning → info), then read (same order)
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  const sorted = [...alerts].sort((a, b) => {
    return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {alerts.length === 0
              ? 'Todo está en orden — sin alertas activas'
              : `${unreadCount} sin leer · ${alerts.length} en total`}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-8 py-16 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Sin alertas activas</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Tu runway está saludable, tus facturas al día y tus gastos bajo control.
            Te avisaremos aquí si algo cambia.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sorted.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>

          <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500">
            <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
            <p>
              Las alertas se calculan en tiempo real a partir de tus transacciones y facturas.
              Cuando la condición deja de cumplirse, la alerta desaparece automáticamente.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
