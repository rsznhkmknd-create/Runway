'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error boundary]', error)
  }, [error])

  return (
    <div className="py-12">
      <ErrorState
        title="No pudimos cargar esta sección"
        message={
          error.message && error.message.length < 200
            ? error.message
            : 'Algo falló al cargar los datos. Revisa tu conexión e inténtalo de nuevo.'
        }
        onRetry={reset}
      />
    </div>
  )
}
