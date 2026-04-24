import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfileId } from '@/lib/supabase/profile'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { exportLimiter } from '@/lib/ratelimit'
import { logActivity } from '@/lib/activity-log'

export const GET = withRateLimit(async (req) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const supabase = createServiceClient()

  const [profile, invoices, transactions, reports, insights, activities, usage] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).single(),
    supabase.from('invoices').select('*').eq('profile_id', profileId),
    supabase.from('transactions').select('*').eq('profile_id', profileId),
    supabase.from('reports').select('*').eq('profile_id', profileId),
    supabase.from('daily_insights').select('*').eq('profile_id', profileId),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('usage_counters').select('*').eq('profile_id', profileId),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    user: profile.data,
    data: {
      invoices: invoices.data ?? [],
      transactions: transactions.data ?? [],
      reports: reports.data ?? [],
      daily_insights: insights.data ?? [],
      activity_logs: activities.data ?? [],
      usage_counters: usage.data ?? [],
    },
  }

  await logActivity(profileId, 'account.export', { clerkUserId: userId, req })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="finsight-export-${today}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}, exportLimiter)
