import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { PLAN_LIMITS } from '@/lib/plans'
import { getCurrentUsage } from '@/lib/usage'
import SettingsSubpageHeader from '@/components/settings/SettingsSubpageHeader'
import PlanOverview from '@/components/settings/PlanOverview'
import type { PlanTier } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Plan y facturación · Ajustes' }

export default async function PlanPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan, plan_renews_at, plan_started_at')
    .eq('clerk_id', userId)
    .single()

  if (!profile) redirect('/sign-in')

  const plan: PlanTier = (profile.plan as PlanTier) ?? 'starter'
  const usage = await getCurrentUsage(profile.id)
  const limits = PLAN_LIMITS[plan]

  // Si no hay renovación explícita, mostramos +1 mes desde plan_started_at como estimación.
  const renewsAt = profile.plan_renews_at ?? addOneMonth(profile.plan_started_at)

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsSubpageHeader
        title="Plan y facturación"
        description="Gestiona tu plan y consulta el uso de este mes"
      />
      <PlanOverview
        currentPlan={plan}
        planRenewsAt={renewsAt}
        usage={usage}
        limits={limits}
      />
    </div>
  )
}

function addOneMonth(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    d.setMonth(d.getMonth() + 1)
    return d.toISOString()
  } catch {
    return null
  }
}
