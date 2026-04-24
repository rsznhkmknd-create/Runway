import type { PlanTier } from './supabase/types'

export type PlanLimits = {
  imports: number | null
  ai_invoices: number | null
  reports: number | null
}

/**
 * Límites mensuales por plan. `null` = sin límite (la UI muestra el contador sin barra).
 * Ajustar estos números aquí cuando el producto defina cuotas reales por plan.
 */
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: { imports: null, ai_invoices: null, reports: null },
  growth:  { imports: null, ai_invoices: null, reports: null },
  pro:     { imports: null, ai_invoices: null, reports: null },
}

/**
 * Precios mensuales por plan en euros. Mostrados en la página /ajustes/plan.
 * Todos los usuarios actuales están en `starter` por defecto.
 */
export const PLAN_PRICING: Record<PlanTier, number> = {
  starter: 29,
  growth: 79,
  pro: 149,
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

export const PLAN_DESCRIPTIONS: Record<PlanTier, string> = {
  starter: 'Lo esencial para empezar a controlar tus finanzas.',
  growth: 'Para negocios que crecen y necesitan más automatización.',
  pro: 'Máximo poder: uso ilimitado y soporte prioritario.',
}

export const PLAN_ORDER: PlanTier[] = ['starter', 'growth', 'pro']
