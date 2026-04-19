import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener datos del usuario desde Clerk (para el upsert de seguridad)
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null

  const body = await request.json()
  const { company_name, industry, country, employee_count, business_type, main_goal } =
    body as {
      company_name: string
      industry: string
      country: string
      employee_count: string
      business_type: string
      main_goal: string
    }

  // Validación básica
  if (!company_name || !industry || !country || !employee_count || !business_type || !main_goal) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert por si el webhook de Clerk aún no creó el perfil
  const { error } = await supabase.from('profiles').upsert(
    {
      clerk_id: userId,
      email,
      full_name: fullName,
      company_name,
      industry,
      country,
      employee_count,
      business_type,
      main_goal,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_id' }
  )

  if (error) {
    console.error('[onboarding] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
