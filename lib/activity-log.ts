import { UAParser } from 'ua-parser-js'
import { createServiceClient } from './supabase/server'
import type { ActivityEventType } from './supabase/types'

type ParsedUA = {
  device_type: string | null
  browser: string | null
  os: string | null
}

/** Parsea un User-Agent en device_type / browser / os. Campos null si no se pueden inferir. */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUA {
  if (!userAgent) return { device_type: null, browser: null, os: null }
  const parser = new UAParser(userAgent)
  const device = parser.getDevice()
  const browser = parser.getBrowser()
  const os = parser.getOS()
  return {
    device_type: device.type ?? 'desktop', // ua-parser deja null en desktops
    browser: browser.name ? [browser.name, browser.version].filter(Boolean).join(' ') : null,
    os: os.name ? [os.name, os.version].filter(Boolean).join(' ') : null,
  }
}

/** Intenta extraer la IP del cliente desde los headers de proxy más comunes. */
export function getClientIp(req: Request | null | undefined): string | null {
  if (!req) return null
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() ?? null
  return req.headers.get('x-real-ip') ?? null
}

type LogContext = {
  clerkUserId: string
  clerkSessionId?: string | null
  req?: Request | null
  userAgent?: string | null
  ipAddress?: string | null
  country?: string | null
  city?: string | null
}

/**
 * Inserta un registro en activity_logs. Nunca lanza — si falla solo loguea;
 * un activity log no debería tumbar un webhook ni un endpoint de negocio.
 */
export async function logActivity(
  profileId: string,
  eventType: ActivityEventType,
  ctx: LogContext
): Promise<void> {
  try {
    const userAgent = ctx.userAgent ?? ctx.req?.headers.get('user-agent') ?? null
    const ipAddress = ctx.ipAddress ?? getClientIp(ctx.req)
    const country = ctx.country ?? ctx.req?.headers.get('x-vercel-ip-country') ?? null
    const city = ctx.city ?? ctx.req?.headers.get('x-vercel-ip-city') ?? null
    const ua = parseUserAgent(userAgent)

    const supabase = createServiceClient()
    await supabase.from('activity_logs').insert({
      profile_id: profileId,
      clerk_user_id: ctx.clerkUserId,
      clerk_session_id: ctx.clerkSessionId ?? null,
      event_type: eventType,
      ip_address: ipAddress,
      country,
      city,
      device_type: ua.device_type,
      browser: ua.browser,
      os: ua.os,
      user_agent: userAgent,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[activity-log] insert failed:', err)
  }
}
