import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfileId } from '@/lib/supabase/profile'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { deleteLimiter } from '@/lib/ratelimit'
import { validateBody } from '@/lib/validation'
import { accountDeleteSchema } from '@/lib/validation/schemas'
import { logActivity } from '@/lib/activity-log'

export const DELETE = withRateLimit(async (req) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const parsed = await validateBody(req, accountDeleteSchema)
  if (parsed.error) return parsed.error

  const profileId = await getProfileId(userId)
  if (!profileId) {
    // Sin profile, solo eliminamos en Clerk.
    try {
      const client = await clerkClient()
      await client.users.deleteUser(userId)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[account-delete] clerk delete without profile failed:', err)
      return NextResponse.json({ error: 'No se pudo eliminar la cuenta' }, { status: 500 })
    }
    return NextResponse.json({ deleted: true })
  }

  // 1. Log de intención (antes de borrar para que quede rastro)
  await logActivity(profileId, 'account.delete_requested', { clerkUserId: userId, req })

  const supabase = createServiceClient()

  // 2. Borrar archivos de Storage (avatars/logos). Best-effort, no bloquea el borrado.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('avatar_url, logo_url')
      .eq('id', profileId)
      .single()

    const urls = [profile?.avatar_url, profile?.logo_url].filter(
      (u): u is string => typeof u === 'string' && u.length > 0
    )

    for (const url of urls) {
      try {
        const parsedUrl = new URL(url)
        // Formato típico: /storage/v1/object/public/<bucket>/<path>
        const parts = parsedUrl.pathname.split('/')
        const idx = parts.indexOf('public')
        if (idx >= 0 && parts.length > idx + 2) {
          const bucket = parts[idx + 1]
          const path = parts.slice(idx + 2).join('/')
          await supabase.storage.from(bucket).remove([path])
        }
      } catch {
        // ignore per-file
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[account-delete] storage cleanup failed:', err)
  }

  // 3. Borrar la fila de profiles — CASCADE se lleva invoices, transactions, reports,
  //    daily_insights, usage_counters y activity_logs.
  const { error: dbError } = await supabase.from('profiles').delete().eq('id', profileId)
  if (dbError) {
    // eslint-disable-next-line no-console
    console.error('[account-delete] supabase delete failed:', dbError)
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta' }, { status: 500 })
  }

  // 4. Eliminar el usuario de Clerk. El webhook `user.deleted` queda como no-op defensivo.
  try {
    const client = await clerkClient()
    await client.users.deleteUser(userId)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[account-delete] clerk delete failed (supabase already purged):', err)
    // Devolvemos 200 igual: los datos ya están borrados; el usuario puede cerrar sesión.
  }

  return NextResponse.json({ deleted: true })
}, deleteLimiter)
