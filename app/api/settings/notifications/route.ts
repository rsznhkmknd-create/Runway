import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfileId } from '@/lib/supabase/profile'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { validateBody } from '@/lib/validation'
import { notificationSettingsSchema } from '@/lib/validation/schemas'

export const GET = withRateLimit(async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_settings')
    .eq('clerk_id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data?.notification_settings })
})

export const PATCH = withRateLimit(async (req) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const parsed = await validateBody(req, notificationSettingsSchema)
  if (parsed.error) return parsed.error

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ notification_settings: parsed.data })
    .eq('id', profileId)
    .select('notification_settings')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data?.notification_settings })
})
