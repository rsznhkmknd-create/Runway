import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'

// Whitelist of fields the client is allowed to patch via this endpoint.
// `email`, `clerk_id`, `onboarding_completed`, `id`, `created_at` are
// intentionally NOT here — they can't be changed from settings.
const EDITABLE_STRING_FIELDS = [
  'full_name',
  'company_name',
  'tax_id',
  'address',
  'city',
  'country',
  'currency',
  'industry',
  'website',
  'logo_url',
  'avatar_url',
] as const

type EditableField = typeof EDITABLE_STRING_FIELDS[number]

const ALLOWED_CURRENCIES = ['EUR', 'CLP', 'MXN', 'COP', 'ARS', 'USD', 'GBP']
const ALLOWED_COUNTRIES  = ['espana', 'chile', 'mexico', 'colombia', 'argentina', 'otro']

export const GET = withRateLimit(async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, company_name, tax_id, address, city, country, currency, industry, website, logo_url, avatar_url'
    )
    .eq('clerk_id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
})

export const PATCH = withRateLimit(async (request) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const patch: Partial<Record<EditableField, string | null>> = {}

  for (const key of EDITABLE_STRING_FIELDS) {
    if (!(key in body)) continue
    const raw = body[key]
    if (raw === null || raw === '') {
      patch[key] = null
    } else if (typeof raw === 'string') {
      patch[key] = raw.trim()
    } else {
      return NextResponse.json(
        { error: `Campo "${key}" debe ser texto` },
        { status: 400 }
      )
    }
  }

  // Validations
  if (patch.currency && !ALLOWED_CURRENCIES.includes(patch.currency)) {
    return NextResponse.json({ error: 'Moneda no soportada' }, { status: 400 })
  }
  if (patch.country && !ALLOWED_COUNTRIES.includes(patch.country)) {
    return NextResponse.json({ error: 'País no soportado' }, { status: 400 })
  }
  if (patch.website && patch.website.length > 0 && !/^https?:\/\//i.test(patch.website)) {
    // Be forgiving: accept `foo.com` → prepend https://
    patch.website = `https://${patch.website}`
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { ...patch, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('clerk_id', userId)
    .select(
      'id, email, full_name, company_name, tax_id, address, city, country, currency, industry, website, logo_url, avatar_url'
    )
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'No se pudo guardar' },
      { status: 500 }
    )
  }

  return NextResponse.json({ profile: data })
})
