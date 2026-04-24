import { createServiceClient } from './server'

/**
 * Busca profiles.id a partir del clerk_id del usuario autenticado.
 * Devuelve null si todavía no existe el profile (p.ej. entre user.created
 * webhook y el siguiente request, o si el webhook aún no se ha procesado).
 */
export async function getProfileId(clerkUserId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkUserId)
    .single()
  return data?.id ?? null
}
