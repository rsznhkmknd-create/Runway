import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfileId } from '@/lib/supabase/profile'
import type { ActivityEventType } from '@/lib/supabase/types'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set')
  }

  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    if (evt.type === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data
      const email = email_addresses[0]?.email_address

      if (email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any).upsert({
          clerk_id: id,
          email,
          full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
          created_at: new Date().toISOString(),
        })
      }
    }

    if (evt.type === 'user.deleted' && evt.data.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).delete().eq('clerk_id', evt.data.id)
    }

    if (evt.type === 'session.created') {
      await recordSessionEvent('session.created', evt.data.user_id, evt.data.id)
    }

    if (evt.type === 'session.ended' || evt.type === 'session.removed' || evt.type === 'session.revoked') {
      const mapped: ActivityEventType =
        evt.type === 'session.revoked' ? 'session.revoked' : 'session.ended'
      await recordSessionEvent(mapped, evt.data.user_id, evt.data.id)
    }
  } catch (err) {
    // Nunca devolvemos 5xx al webhook: Svix reintentaría agresivamente y duplicaría efectos.
    // eslint-disable-next-line no-console
    console.error('[clerk-webhook] handler error:', err)
  }

  return new Response('OK', { status: 200 })
}

/**
 * Inserta una entrada de activity_logs para un evento de sesión de Clerk.
 * El payload de session.* no trae IP/UA directamente — hay que hacer getSession para leer latestActivity.
 * Si profile_id aún no existe (race con user.created), reintenta una vez con 500ms backoff.
 */
async function recordSessionEvent(
  eventType: ActivityEventType,
  clerkUserId: string,
  clerkSessionId: string
): Promise<void> {
  let profileId = await getProfileId(clerkUserId)
  if (!profileId) {
    await new Promise((r) => setTimeout(r, 500))
    profileId = await getProfileId(clerkUserId)
    if (!profileId) {
      // eslint-disable-next-line no-console
      console.warn('[clerk-webhook] profile not found for', clerkUserId, '— dropping', eventType)
      return
    }
  }

  // Enriquecer con datos de Clerk (IP, browser, device, city). No bloqueante.
  let browser: string | null = null
  let deviceType: string | null = null
  let ipAddress: string | null = null
  let country: string | null = null
  let city: string | null = null
  try {
    const client = await clerkClient()
    const session = await client.sessions.getSession(clerkSessionId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activity = (session as any).latestActivity
    if (activity) {
      browser = [activity.browserName, activity.browserVersion].filter(Boolean).join(' ') || null
      deviceType = activity.deviceType ?? null
      ipAddress = activity.ipAddress ?? null
      country = activity.country ?? null
      city = activity.city ?? null
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[clerk-webhook] could not enrich session', clerkSessionId, err)
  }

  const supabase = createServiceClient()
  await supabase.from('activity_logs').insert({
    profile_id: profileId,
    clerk_user_id: clerkUserId,
    clerk_session_id: clerkSessionId,
    event_type: eventType,
    ip_address: ipAddress,
    country,
    city,
    device_type: deviceType,
    browser,
    os: null,
    user_agent: null,
  })
}
