import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfileId } from '@/lib/supabase/profile'
import { withRateLimit } from '@/lib/api/with-rate-limit'

type SessionView = {
  id: string
  current: boolean
  status: string
  createdAt: number
  lastActiveAt: number | null
  expireAt: number | null
  ipAddress: string | null
  city: string | null
  country: string | null
  deviceType: string | null
  browser: string | null
}

export const GET = withRateLimit(async () => {
  const { userId, sessionId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const client = await clerkClient()
  const { data: sessions } = await client.sessions.getSessionList({ userId, status: 'active' })

  const mapped: SessionView[] = sessions.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activity = (s as any).latestActivity
    return {
      id: s.id,
      current: s.id === sessionId,
      status: s.status,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt ?? null,
      expireAt: s.expireAt ?? null,
      ipAddress: activity?.ipAddress ?? null,
      city: activity?.city ?? null,
      country: activity?.country ?? null,
      deviceType: activity?.deviceType ?? null,
      browser:
        [activity?.browserName, activity?.browserVersion].filter(Boolean).join(' ') || null,
    }
  })

  return NextResponse.json({ sessions: mapped })
})

/** Revoca todas las sesiones del usuario excepto la actual. */
export const DELETE = withRateLimit(async () => {
  const { userId, sessionId } = await auth()
  if (!userId || !sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const client = await clerkClient()
  const { data: sessions } = await client.sessions.getSessionList({ userId, status: 'active' })

  const toRevoke = sessions.filter((s) => s.id !== sessionId)
  const results = await Promise.allSettled(
    toRevoke.map((s) => client.sessions.revokeSession(s.id))
  )

  const revoked = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - revoked

  // Log auditable (session.revoked se emite por Clerk vía webhook; aquí solo dejamos trace)
  if (revoked > 0) {
    const profileId = await getProfileId(userId)
    if (profileId) {
      const supabase = createServiceClient()
      await supabase.from('activity_logs').insert({
        profile_id: profileId,
        clerk_user_id: userId,
        clerk_session_id: null,
        event_type: 'session.revoked',
        ip_address: null,
        country: null,
        city: null,
        device_type: null,
        browser: null,
        os: null,
        user_agent: `bulk revoke: ${revoked} sesiones`,
      })
    }
  }

  return NextResponse.json({ revoked, failed })
})
