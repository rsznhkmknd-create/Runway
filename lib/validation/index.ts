import { NextResponse } from 'next/server'
import type { z } from 'zod'

type ValidateResult<T> = { data: T; error?: never } | { data?: never; error: NextResponse }

/**
 * Parsea el body JSON del Request y lo valida contra un schema de zod.
 * Si falla, devuelve 400 con {error, issues}. Nunca lanza.
 */
export async function validateBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ValidateResult<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Payload no es JSON válido' },
        { status: 400 }
      ),
    }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: 'Payload inválido', issues: parsed.error.flatten() },
        { status: 400 }
      ),
    }
  }

  return { data: parsed.data }
}

/**
 * Trim, strip control chars (excepto \n y \t), enforce max length.
 * Usar en cualquier string que se persista desde input de usuario.
 */
export function sanitizeString(value: string, maxLen = 1000): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen)
}
