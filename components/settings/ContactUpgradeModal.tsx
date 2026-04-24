'use client'

import { X, Mail } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRICING } from '@/lib/plans'
import type { PlanTier } from '@/lib/supabase/types'

type Props = {
  targetPlan: PlanTier
  onClose: () => void
}

export default function ContactUpgradeModal({ targetPlan, onClose }: Props) {
  const label = PLAN_LABELS[targetPlan]
  const price = PLAN_PRICING[targetPlan]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-brand-600" />
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Próximamente — {label} a {price}€/mes
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Todavía estamos preparando la pasarela de pagos. Mientras tanto, escríbenos y activamos tu
          plan {label} manualmente en menos de 24 horas.
        </p>

        <a
          href={`mailto:hola@finsight.app?subject=${encodeURIComponent(
            `Upgrade a plan ${label}`
          )}&body=${encodeURIComponent(
            `Hola, me gustaría cambiar al plan ${label} (${price}€/mes). Gracias.`
          )}`}
          className="inline-flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Mail className="w-4 h-4" />
          Contactar con nosotros
        </a>
      </div>
    </div>
  )
}
