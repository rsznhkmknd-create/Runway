import { createServiceClient } from './supabase/server'

export type UsageCounts = {
  imports_count: number
  ai_invoices_count: number
  reports_count: number
}

const ZERO_USAGE: UsageCounts = {
  imports_count: 0,
  ai_invoices_count: 0,
  reports_count: 0,
}

/** Primer día del mes actual en formato YYYY-MM-DD (UTC). */
export function currentPeriodStart(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/** Lee los contadores del mes en curso para un profile. 0s si no existe fila. */
export async function getCurrentUsage(profileId: string): Promise<UsageCounts> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('usage_counters')
    .select('imports_count, ai_invoices_count, reports_count')
    .eq('profile_id', profileId)
    .eq('period_start', currentPeriodStart())
    .maybeSingle()
  return data ?? ZERO_USAGE
}

type CounterField = 'imports_count' | 'ai_invoices_count' | 'reports_count'

/**
 * Incrementa un contador del mes actual. Crea la fila si no existe.
 * Nunca lanza — si falla solo loguea; no queremos que un error de contador
 * tumbe la operación de negocio (import/extract/report).
 */
export async function incrementUsage(
  profileId: string,
  field: CounterField,
  delta = 1
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const period = currentPeriodStart()

    // Intento rápido: upsert. Si ya existe, hacemos un update atómico con el valor actual + delta.
    const { data: existing } = await supabase
      .from('usage_counters')
      .select(`id, ${field}`)
      .eq('profile_id', profileId)
      .eq('period_start', period)
      .maybeSingle()

    if (existing) {
      const current = (existing as Record<string, unknown>)[field] as number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('usage_counters') as any)
        .update({ [field]: current + delta, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('usage_counters').insert({
        profile_id: profileId,
        period_start: period,
        imports_count: field === 'imports_count' ? delta : 0,
        ai_invoices_count: field === 'ai_invoices_count' ? delta : 0,
        reports_count: field === 'reports_count' ? delta : 0,
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[usage] increment failed:', err)
  }
}
