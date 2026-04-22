'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  id:      string
  kind:    ToastKind
  message: string
}

type ToastApi = {
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Allow calling outside provider silently — prevents crashes in edge cases.
    return {
      success: () => {},
      error:   () => {},
      info:    () => {},
    }
  }
  return ctx
}

const DURATION_MS = 4200

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((list) => [...list, { id, kind, message }])
      const timer = setTimeout(() => dismiss(id), DURATION_MS)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach(clearTimeout)
      t.clear()
    }
  }, [])

  const api: ToastApi = {
    success: (m) => push('success', m),
    error:   (m) => push('error',   m),
    info:    (m) => push('info',    m),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = {
    success: { Icon: CheckCircle2, classes: 'border-brand-200 bg-white text-gray-900',    iconColor: 'text-brand-600' },
    error:   { Icon: AlertCircle,  classes: 'border-red-200 bg-white text-gray-900',      iconColor: 'text-red-600'   },
    info:    { Icon: Info,         classes: 'border-gray-200 bg-white text-gray-900',     iconColor: 'text-gray-600'  },
  }[toast.kind]

  const { Icon, classes, iconColor } = config

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 text-sm',
        classes
      )}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', iconColor)} />
      <p className="flex-1 leading-relaxed">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50"
        aria-label="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
