'use client'

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PLAN_DESCRIPTIONS,
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_PRICING,
} from '@/lib/plans'
import type { PlanLimits } from '@/lib/plans'
import type { PlanTier } from '@/lib/supabase/types'
import type { UsageCounts } from '@/lib/usage'
import UsageBars from './UsageBars'
import ContactUpgradeModal from './ContactUpgradeModal'

type Props = {
  currentPlan: PlanTier
  planRenewsAt: string | null
  usage: UsageCounts
  limits: PlanLimits
}

const TIER_FEATURES: Record<PlanTier, string[]> = {
  starter: [
    'Importaciones ilimitadas este mes',
    'Extracción de facturas con IA',
    'Reportes semanales y mensuales',
    'Soporte por email',
  ],
  growth: [
    'Todo lo de Starter',
    'Dashboard de runway en tiempo real',
    'Alertas proactivas de tesorería',
    'Exportación avanzada',
  ],
  pro: [
    'Todo lo de Growth',
    'Sin límites de uso',
    'Insights personalizados con IA',
    'Soporte prioritario 24/7',
  ],
}

function formatRenewal(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default function PlanOverview({ currentPlan, planRenewsAt, usage, limits }: Props) {
  const [upgradeTarget, setUpgradeTarget] = useState<PlanTier | null>(null)

  return (
    <>
      {/* Plan actual */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted font-semibold">Plan actual</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-2xl font-bold text-text-primary">{PLAN_LABELS[currentPlan]}</h2>
              <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3" />
                Activo
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1">{PLAN_DESCRIPTIONS[currentPlan]}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Próxima renovación</p>
            <p className="text-sm font-semibold text-text-primary mt-0.5">
              {formatRenewal(planRenewsAt)}
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-6 pt-6">
          <p className="text-sm font-semibold text-text-primary mb-4">Uso este mes</p>
          <UsageBars usage={usage} limits={limits} />
        </div>
      </div>

      {/* Otros planes */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Cambiar de plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_ORDER.map((plan) => {
            const isCurrent = plan === currentPlan
            const price = PLAN_PRICING[plan]
            return (
              <div
                key={plan}
                className={cn(
                  'bg-surface rounded-2xl border shadow-sm p-5 flex flex-col',
                  isCurrent ? 'border-brand-400' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-base font-semibold text-text-primary">{PLAN_LABELS[plan]}</p>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Tu plan
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mb-4">{PLAN_DESCRIPTIONS[plan]}</p>
                <p className="text-2xl font-bold text-text-primary">
                  {price}€
                  <span className="text-xs font-medium text-text-muted"> /mes</span>
                </p>

                <ul className="text-xs text-text-secondary space-y-2 mt-4 mb-5 flex-1">
                  {TIER_FEATURES[plan].map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setUpgradeTarget(plan)}
                  className={cn(
                    'w-full text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors',
                    isCurrent
                      ? 'bg-surface-2 text-text-muted cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  )}
                >
                  {isCurrent ? 'Plan actual' : `Cambiar a ${PLAN_LABELS[plan]}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {upgradeTarget && (
        <ContactUpgradeModal
          targetPlan={upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
        />
      )}
    </>
  )
}
