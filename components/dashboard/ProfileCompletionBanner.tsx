'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, X, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'finsight.profile_banner_dismissed'

export default function ProfileCompletionBanner() {
  const [visible, setVisible] = useState(false)

  // Persistimos el dismiss en localStorage para que no reaparezca en cada
  // navegación. Se monta oculto y se muestra tras leer localStorage en cliente
  // — así evitamos un flash del banner antes del hidrate.
  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === '1'
      setVisible(!dismissed)
    } catch {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 sm:px-5 sm:py-4">
      <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 text-brand-700">
        <Building2 className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">
          Completa tu perfil de empresa
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          Añade logo, CIF/NIF y dirección para personalizar tus facturas y reportes.
        </p>
      </div>
      <Link
        href="/dashboard/ajustes"
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-100/60"
      >
        Completar
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-brand-100/60"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
