'use client'

// Next.js requires this to exist so the runtime has a fallback when even
// the root layout fails to render. Must return its own <html>/<body>.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          La aplicación falló al cargar
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Por favor recarga la página. Si el problema persiste, contacta a soporte.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#00C48C',
            color: 'white',
            fontWeight: 600,
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        {error.digest && (
          <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 24 }}>ref: {error.digest}</p>
        )}
      </body>
    </html>
  )
}
