import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { Limiter } from '@/lib/ratelimit'
import { apiLimiter } from '@/lib/ratelimit'

type Handler = (req: Request, ...args: any[]) => Promise<Response> | Response

/**
 * Wrapper para API routes que aplica rate limiting.
 *
 *   export const GET = withRateLimit(async (req) => { ... })
 *   export const POST = withRateLimit(async (req) => { ... }, aiLimiter)
 *
 * El key es el clerk userId cuando hay auth; fallback a x-forwarded-for IP.
 * En 429 devuelve JSON {error, retryAfter} con headers Retry-After, X-RateLimit-*.
 */
export function withRateLimit(handler: Handler, limiter: Limiter = apiLimiter): Handler {
  return async (req: Request, ...args: any[]) => {
    const { userId } = await auth()
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip')?.trim() ??
      'anon'
    const key = userId ?? ip

    const { success, limit, remaining, reset } = await limiter.limit(key)

    if (!success) {
      const now = Date.now()
      const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000))
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Inténtalo más tarde.', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        }
      )
    }

    return handler(req, ...args)
  }
}
