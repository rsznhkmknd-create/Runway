'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  title?:    string
  message?:  string
  onRetry?:  () => void
  retryLabel?: string
}

export default function ErrorState({
  title    = 'Algo salió mal',
  message  = 'No pudimos cargar los datos. Inténtalo de nuevo.',
  onRetry,
  retryLabel = 'Reintentar',
}: Props) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/40 px-8 py-12 text-center max-w-xl mx-auto">
      <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="text-lg font-bold text-text-primary mb-2">{title}</h2>
      <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
