import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfileId } from '@/lib/supabase/profile'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { PLAN_LIMITS, PLAN_PRICING } from '@/lib/plans'
import { getCurrentUsage } from '@/lib/usage'
import type { PlanTier } from '@/lib/supabase/types'

export const GET = withRateLimit(async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('plan, plan_started_at, plan_renews_at')
    .eq('id', profileId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const plan = (data?.plan as PlanTier) ?? 'starter'
  const usage = await getCurrentUsage(profileId)

  return NextResponse.json({
    plan,
    plan_started_at: data?.plan_started_at ?? null,
    plan_renews_at: data?.plan_renews_at ?? null,
    pricing: PLAN_PRICING,
    limits: PLAN_LIMITS[plan],
    usage,
  })
})
