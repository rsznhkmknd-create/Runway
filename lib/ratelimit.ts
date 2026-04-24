import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type LimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export interface Limiter {
  limit(key: string): Promise<LimitResult>
}

// ── Fallback pass-through cuando Upstash no está configurado (dev local) ──
let warned = false
function warnOnce() {
  if (warned) return
  warned = true
  // eslint-disable-next-line no-console
  console.warn(
    '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN no configuradas. Rate limiting deshabilitado (fallback pass-through).'
  )
}

const passthrough: Limiter = {
  async limit() {
    warnOnce()
    return { success: true, limit: 0, remaining: 0, reset: 0 }
  },
}

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

const redis = hasUpstash ? Redis.fromEnv() : null

function build(
  limiter: InstanceType<typeof Ratelimit>['limiter'],
  prefix: string
): Limiter {
  if (!redis) return passthrough
  return new Ratelimit({
    redis,
    limiter,
    analytics: true,
    prefix,
  })
}

/** 60 req / min — aplicado a API routes autenticadas estándar */
export const apiLimiter = build(Ratelimit.slidingWindow(60, '1 m'), 'rl:api')

/** 10 req / min — para rutas con Anthropic (caras) */
export const aiLimiter = build(Ratelimit.slidingWindow(10, '1 m'), 'rl:ai')

/** 1 req / min — export de datos (operación pesada + exfiltración) */
export const exportLimiter = build(Ratelimit.slidingWindow(1, '1 m'), 'rl:export')

/** 3 req / hour — borrado de cuenta (irreversible) */
export const deleteLimiter = build(Ratelimit.slidingWindow(3, '1 h'), 'rl:delete')
