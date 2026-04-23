'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useAlerts } from './AlertsProvider'
import { cn } from '@/lib/utils'

export default function BellBadge() {
  const { unreadCount } = useAlerts()
  const hasAlerts = unreadCount > 0

  return (
    <Link
      href="/dashboard/alertas"
      aria-label={
        hasAlerts
          ? `${unreadCount} alerta${unreadCount === 1 ? '' : 's'} sin leer`
          : 'Sin alertas'
      }
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors"
    >
      <Bell className="w-4.5 h-4.5" />

      {hasAlerts ? (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full',
            'bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center',
            'ring-2 ring-white'
          )}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : (
        // "All good" mint dot when no unread alerts — per Finsight spec.
        <span
          className={cn(
            'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500'
          )}
        />
      )}
    </Link>
  )
}
