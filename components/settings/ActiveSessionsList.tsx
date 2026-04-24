'use client'

import { useEffect, useState } from 'react'
import { Monitor, Smartphone, Tablet, Globe, Loader2, LogOut } from 'lucide-react'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'

type Session = {
  id: string
  current: boolean
  status: string
  createdAt: number
  lastActiveAt: number | null
  expireAt: number | null
  ipAddress: string | null
  city: string | null
  country: string | null
  deviceType: string | null
  browser: string | null
}

function deviceIcon(type: string | null) {
  switch ((type ?? '').toLowerCase()) {
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    case 'desktop':
    case '':
      return Monitor
    default:
      return Globe
  }
}

function formatWhen(ts: number | null) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatLocation(s: Session) {
  const parts = [s.city, s.country].filter(Boolean)
  if (parts.length === 0) return s.ipAddress ?? 'Ubicación desconocida'
  return parts.join(', ')
}

export default function ActiveSessionsList() {
  const toast = useToast()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { sessions } = await fetchJson<{ sessions: Session[] }>('/api/settings/sessions')
      setSessions(sessions)
    } catch (err) {
      setError(err instanceof FetchJsonError ? err.message : 'No se pudieron cargar las sesiones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleRevokeAll = async () => {
    if (revoking) return
    setRevoking(true)
    try {
      const { revoked, failed } = await fetchJson<{ revoked: number; failed: number }>(
        '/api/settings/sessions',
        { method: 'DELETE' }
      )
      if (revoked > 0) {
        toast.success(`Se cerraron ${revoked} sesión${revoked === 1 ? '' : 'es'}.`)
      } else {
        toast.info('No había otras sesiones activas.')
      }
      if (failed > 0) {
        toast.error(`${failed} sesión${failed === 1 ? '' : 'es'} no se pudo cerrar.`)
      }
      await load()
    } catch (err) {
      toast.error(err instanceof FetchJsonError ? err.message : 'No se pudieron cerrar las sesiones')
    } finally {
      setRevoking(false)
    }
  }

  const others = (sessions ?? []).filter((s) => !s.current)

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Sesiones activas</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Dispositivos donde has iniciado sesión recientemente.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRevokeAll}
          disabled={revoking || others.length === 0}
          className="inline-flex items-center gap-2 text-sm font-medium text-red-600 border border-red-200 px-3.5 py-2 rounded-xl hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Cerrar las demás
        </button>
      </div>

      {error && (
        <div className="px-6 pb-4">
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-sm text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Cargando sesiones…
        </div>
      ) : sessions && sessions.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {sessions.map((s) => {
            const Icon = deviceIcon(s.deviceType)
            return (
              <li key={s.id} className="flex items-start gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0 text-text-secondary">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {s.browser ?? s.deviceType ?? 'Dispositivo desconocido'}
                    </p>
                    {s.current && (
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Este dispositivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{formatLocation(s)}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Último acceso: {formatWhen(s.lastActiveAt ?? s.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="px-6 py-8 text-center text-sm text-text-muted">
          No hay sesiones activas.
        </div>
      )}
    </div>
  )
}
