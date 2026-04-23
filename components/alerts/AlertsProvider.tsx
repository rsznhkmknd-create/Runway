'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Alert } from '@/lib/alerts/types'

const STORAGE_KEY = 'finsight.alerts.dismissed.v1'

type AlertsApi = {
  alerts:        Alert[]
  unreadCount:   number
  isDismissed:   (id: string) => boolean
  markRead:      (id: string) => void
  markUnread:    (id: string) => void
  markAllRead:   () => void
}

const AlertsContext = createContext<AlertsApi | null>(null)

export function useAlerts(): AlertsApi {
  const ctx = useContext(AlertsContext)
  if (!ctx) {
    // Safe fallback — prevents crashes if a consumer mounts outside the provider.
    return {
      alerts:      [],
      unreadCount: 0,
      isDismissed: () => false,
      markRead:    () => {},
      markUnread:  () => {},
      markAllRead: () => {},
    }
  }
  return ctx
}

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === 'string'))
  } catch {
    // corrupt storage — reset silently
  }
  return new Set()
}

function saveDismissed(set: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // quota / private mode — ignore
  }
}

export function AlertsProvider({
  alerts,
  children,
}: {
  alerts:   Alert[]
  children: React.ReactNode
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())

  // Hydrate from localStorage after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  // Keep multi-tab / multi-component state in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDismissed(loadDismissed())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const markRead = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }, [])

  const markUnread = useCallback((id: string) => {
    setDismissed((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      saveDismissed(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev)
      for (const a of alerts) next.add(a.id)
      saveDismissed(next)
      return next
    })
  }, [alerts])

  const unreadCount = useMemo(
    () => alerts.filter((a) => !dismissed.has(a.id)).length,
    [alerts, dismissed]
  )

  const api: AlertsApi = useMemo(
    () => ({
      alerts,
      unreadCount,
      isDismissed: (id: string) => dismissed.has(id),
      markRead,
      markUnread,
      markAllRead,
    }),
    [alerts, unreadCount, dismissed, markRead, markUnread, markAllRead]
  )

  return <AlertsContext.Provider value={api}>{children}</AlertsContext.Provider>
}
