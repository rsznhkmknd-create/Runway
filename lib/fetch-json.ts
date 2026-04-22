/**
 * fetchJson — wrapper around fetch with:
 *   - AbortController timeout (default 30s)
 *   - automatic redirect to /sign-in?expired=1 on 401
 *   - Spanish error messages for network / timeout failures
 *   - JSON parsing of both success and error responses
 *
 * Throws FetchJsonError on any failure. Callers should try/catch.
 */

export class FetchJsonError extends Error {
  readonly status: number
  readonly kind: 'network' | 'timeout' | 'http' | 'parse' | 'aborted'

  constructor(message: string, kind: FetchJsonError['kind'], status = 0) {
    super(message)
    this.name = 'FetchJsonError'
    this.kind = kind
    this.status = status
  }
}

type Options = RequestInit & {
  timeoutMs?:           number
  redirectOnUnauth?:    boolean
}

const DEFAULT_TIMEOUT_MS = 30_000

export async function fetchJson<T = unknown>(
  url: string,
  options: Options = {}
): Promise<T> {
  const {
    timeoutMs          = DEFAULT_TIMEOUT_MS,
    redirectOnUnauth   = true,
    ...init
  } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new FetchJsonError(
        `La solicitud tardó más de ${Math.round(timeoutMs / 1000)} segundos. Inténtalo de nuevo.`,
        'timeout'
      )
    }
    throw new FetchJsonError(
      'Error de red. Verifica tu conexión e inténtalo de nuevo.',
      'network'
    )
  }
  clearTimeout(timer)

  if (res.status === 401 && redirectOnUnauth && typeof window !== 'undefined') {
    // Session expired — redirect to sign-in with a flag
    window.location.href = '/sign-in?expired=1'
    // Throw so callers stop their flow; unreachable in practice after redirect.
    throw new FetchJsonError('Tu sesión expiró.', 'http', 401)
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    if (res.ok) {
      throw new FetchJsonError(
        'La respuesta del servidor no es JSON válido.',
        'parse',
        res.status
      )
    }
    throw new FetchJsonError(
      `Error ${res.status}: ${res.statusText || 'sin detalles'}`,
      'http',
      res.status
    )
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : null) ?? `Error ${res.status}`
    throw new FetchJsonError(msg, 'http', res.status)
  }

  return json as T
}
