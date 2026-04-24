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
      className="group relative w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors duration-200 ease-out active:scale-[0.94]"
    >
      <Bell
        className={cn(
          'w-4.5 h-4.5 transition-transform duration-200 ease-out',
          hasAlerts && 'group-hover:-rotate-6'
        )}
      />

      {hasAlerts ? (
        <span className="absolute -top-0.5 -right-0.5 inline-flex">
          {/* Ping ring — subtle, Linear-style */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-red-500 opacity-60 animate-ping"
          />
          <span
            className={cn(
              'relative inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full',
              'bg-red-500 text-white text-[10px] font-bold leading-none',
              'ring-2 ring-app shadow-[0_0_0_1px_rgba(239,68,68,0.25)]'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </span>
      ) : (
        // "All good" mint dot when no unread alerts — per Finsight spec.
        <span className={cn('absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500')} />
      )}
    </Link>
  )
}
