'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Undo2,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlerts } from './AlertsProvider'
import type { Alert } from '@/lib/alerts/types'

type Props = { alert: Alert }

const SEVERITY_STYLES: Record<
  Alert['severity'],
  {
    Icon: typeof AlertTriangle
    border: string
    bg:     string
    iconBg: string
    iconColor: string
    titleColor: string
    label: string
  }
> = {
  critical: {
    Icon: AlertTriangle,
    border: 'border-red-200',
    bg:     'bg-red-50/70',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-700',
    label: 'Crítica',
  },
  warning: {
    Icon: AlertCircle,
    border: 'border-amber-200',
    bg:     'bg-amber-50/70',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-700',
    label: 'Advertencia',
  },
  info: {
    Icon: Info,
    border: 'border-blue-200',
    bg:     'bg-blue-50/70',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-700',
    label: 'Info',
  },
}

export default function AlertCard({ alert }: Props) {
  const { isDismissed, markRead, markUnread } = useAlerts()
  const read = isDismissed(alert.id)
  const s = SEVERITY_STYLES[alert.severity]
  const Icon = s.Icon

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm px-5 py-4 transition-opacity',
        s.border,
        s.bg,
        read && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            s.iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', s.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className={cn('font-semibold text-sm', s.titleColor)}>
              {alert.title}
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted bg-surface border border-border rounded-full px-2 py-0.5">
              {s.label}
            </span>
            {read && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                · Leída
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{alert.message}</p>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {alert.action && (
              <Link
                href={alert.action.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
              >
                {alert.action.label}
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}

            {read ? (
              <button
                onClick={() => markUnread(alert.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-2 transition-colors"
              >
                <Undo2 className="w-3 h-3" />
                Marcar sin leer
              </button>
            ) : (
              <button
                onClick={() => markRead(alert.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-2 transition-colors"
              >
                <Check className="w-3 h-3" />
                Marcar como leída
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
