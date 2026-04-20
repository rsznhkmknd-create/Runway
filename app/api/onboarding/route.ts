import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { ONBOARDING_COOKIE } from '@/middleware'

export async function POST(request: Request) {
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

  // Service role client — bypasses RLS, no cookies needed
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Upsert: cubre el caso donde el webhook aún no creó el perfil
  const { error } = await supabase.from('profiles').upsert(
    {
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
    },
    { onConflict: 'clerk_id' }
  )

  if (error) {
    console.error('[onboarding] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Establecer cookie para que el middleware no vuelva a redirigir al wizard
  const response = NextResponse.json({ success: true })
  response.cookies.set(ONBOARDING_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    // 1 año — el usuario no tiene que repetir el onboarding
    maxAge:   60 * 60 * 24 * 365,
    secure:   process.env.NODE_ENV === 'production',
  })

  return response
}
