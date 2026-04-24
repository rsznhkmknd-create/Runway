import { createServiceClient } from './server'

export type CompanyProfile = {
  id: string
  clerk_id: string
  email: string
  full_name: string | null
  company_name: string | null
  currency: string
  industry: string | null
  country: string | null
  city: string | null
  tax_id: string | null
  address: string | null
  website: string | null
  logo_url: string | null
  avatar_url: string | null
  onboarding_completed: boolean
}

const COMPANY_FIELDS =
  'id, clerk_id, email, full_name, company_name, currency, industry, country, city, tax_id, address, website, logo_url, avatar_url, onboarding_completed'

/**
 * Lee el perfil de empresa completo para el usuario autenticado.
 * Centraliza el SELECT que antes se duplicaba en dashboard/layout, reports API,
 * insights API y settings. Añadir un campo nuevo al contexto global solo requiere
 * editar COMPANY_FIELDS y el tipo CompanyProfile.
 */
export async function getCompanyProfile(
  clerkUserId: string
): Promise<CompanyProfile | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select(COMPANY_FIELDS)
    .eq('clerk_id', clerkUserId)
    .single()

  return (data as CompanyProfile) ?? null
}

/**
 * true si el perfil de empresa tiene los campos necesarios para emitir facturas
 * con pinta profesional (logo, identificador fiscal, dirección). Controla la
 * visibilidad del banner "Completa tu perfil de empresa" en el dashboard.
 */
export function isProfileComplete(profile: CompanyProfile | null): boolean {
  if (!profile) return false
  return Boolean(
    profile.logo_url?.trim() &&
      profile.tax_id?.trim() &&
      profile.address?.trim()
  )
}

/**
 * Etiqueta amigable para el perfil: nombre de empresa si está, full_name como
 * fallback, y "Mi empresa" como último recurso. Útil para sidebars y headers.
 */
export function companyLabel(profile: CompanyProfile | null): string {
  return (
    profile?.company_name?.trim() ||
    profile?.full_name?.trim() ||
    'Mi empresa'
  )
}
