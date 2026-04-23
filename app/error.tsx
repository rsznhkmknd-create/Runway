'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root error boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface">
      <ErrorState
        title="Algo se rompió en la aplicación"
        message="Encontramos un error inesperado. Puedes reintentar — si el problema persiste, recarga la página."
        onRetry={reset}
      />
    </div>
  )
}
