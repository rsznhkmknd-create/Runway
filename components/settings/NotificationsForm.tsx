'use client'

import { useState } from 'react'
import { Loader2, Save, TrendingDown, AlertCircle, CalendarDays, CalendarClock, TrendingUp } from 'lucide-react'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'
import ToggleSwitch from './ToggleSwitch'
import type { NotificationSettings } from '@/lib/supabase/types'

type Props = {
  initial: NotificationSettings
}

type Row = {
  key: keyof NotificationSettings
  icon: typeof TrendingDown
  title: string
  description: string
}

const ROWS: Row[] = [
  {
    key: 'runway_low',
    icon: TrendingDown,
    title: 'Runway bajo',
    description: 'Recibe un email cuando tu runway baje de 3 meses.',
  },
  {
    key: 'invoices_overdue',
    icon: AlertCircle,
    title: 'Facturas vencidas',
    description: 'Email cuando haya facturas pendientes vencidas.',
  },
  {
    key: 'weekly_summary',
    icon: CalendarDays,
    title: 'Resumen semanal',
    description: 'Resumen por email cada lunes con el estado financiero de la semana.',
  },
  {
    key: 'monthly_summary',
    icon: CalendarClock,
    title: 'Resumen mensual',
    description: 'Resumen el primer día de cada mes con ingresos, gastos y tendencias.',
  },
  {
    key: 'expense_spike',
    icon: TrendingUp,
    title: 'Subidas de gasto',
    description: 'Alerta cuando los gastos suban más de un 20 % respecto al mes anterior.',
  },
]

export default function NotificationsForm({ initial }: Props) {
  const toast = useToast()
  const [settings, setSettings] = useState<NotificationSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const dirty = ROWS.some(({ key }) => settings[key] !== initial[key])

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await fetchJson('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      toast.success('Preferencias guardadas.')
    } catch (err) {
      const message =
        err instanceof FetchJsonError ? err.message : 'No se pudieron guardar las preferencias'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="divide-y divide-border">
        {ROWS.map(({ key, icon: Icon, title, description }) => (
          <div key={key} className="flex items-start gap-4 px-6 py-5">
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0 text-brand-600">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{title}</p>
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            </div>
            <div className="pt-0.5">
              <ToggleSwitch
                checked={settings[key]}
                onChange={() => toggle(key)}
                label={title}
                disabled={saving}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-6 pt-4">
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-2/50">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
