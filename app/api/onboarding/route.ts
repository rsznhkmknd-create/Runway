import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import type { Database } from '@/lib/supabase/types'

export const POST = withRateLimit(async (request) => {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Datos del usuario desde Clerk (para upsert seguro)
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null

  const body = await request.json()
  const { company_name, industry, country, employee_count, business_type, website, main_goal } =
    body as {
      company_name: string
      industry: string
      country: string
      employee_count: string
      business_type: string
      website?: string
      main_goal: string
    }

  // Validación básica
  if (!company_name || !industry || !country || !employee_count || !business_type || !main_goal) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  // --- DEBUG LOGS (eliminar tras diagnosticar) ---
  console.log('[onboarding] userId de Clerk:', userId)
  console.log('[onboarding] SUPABASE_SERVICE_ROLE_KEY presente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('[onboarding] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  // ------------------------------------------------

  // Service role client — bypasses RLS, no cookies needed
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const upsertPayload = {
    clerk_id:             userId,
    email,
    full_name:            fullName,
    company_name,
    industry,
    country,
    employee_count,
    business_type,
    website:              website || null,
    main_goal,
    onboarding_completed: true,
    updated_at:           new Date().toISOString(),
  }

  console.log('[onboarding] payload enviado a Supabase:', JSON.stringify(upsertPayload))

  // Upsert: cubre el caso donde el webhook aún no creó el perfil
  const { error, data, status, statusText } = await supabase.from('profiles').upsert(
    upsertPayload,
    { onConflict: 'clerk_id' }
  ).select()

  if (error) {
    console.error('[onboarding] Supabase error completo:', JSON.stringify({
      message:    error.message,
      details:    error.details,
      hint:       error.hint,
      code:       error.code,
      status,
      statusText,
    }))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[onboarding] upsert exitoso, filas afectadas:', JSON.stringify(data))

  return NextResponse.json({ success: true })
})
