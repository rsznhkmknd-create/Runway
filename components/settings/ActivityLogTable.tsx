import { Clock } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type LogRow = Database['public']['Tables']['activity_logs']['Row']

type Props = {
  logs: LogRow[]
}

const EVENT_LABEL: Record<string, string> = {
  'session.created': 'Inicio de sesión',
  'session.ended': 'Cierre de sesión',
  'session.revoked': 'Sesión revocada',
  'account.export': 'Exportación de datos',
  'account.delete_requested': 'Borrado de cuenta',
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatLocation(row: LogRow) {
  const parts = [row.city, row.country].filter(Boolean)
  if (parts.length) return parts.join(', ')
  return row.ip_address ?? '—'
}

function formatDevice(row: LogRow) {
  const parts = [row.browser, row.os].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  return row.device_type ?? '—'
}

export default function ActivityLogTable({ logs }: Props) {
  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted" />
          Actividad reciente
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Últimos 10 eventos de seguridad de tu cuenta.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-text-muted border-t border-border">
          Todavía no hay actividad registrada.
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted bg-surface-2/50">
                <th className="text-left font-medium px-6 py-2.5">Evento</th>
                <th className="text-left font-medium px-4 py-2.5">Fecha</th>
                <th className="text-left font-medium px-4 py-2.5">Dispositivo</th>
                <th className="text-left font-medium px-6 py-2.5">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-3 text-text-primary font-medium">
                    {EVENT_LABEL[row.event_type] ?? row.event_type}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {formatWhen(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatDevice(row)}</td>
                  <td className="px-6 py-3 text-text-secondary">{formatLocation(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
