import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Sin sesión → login
  if (!userId) redirect('/sign-in')

  // Siempre verificar Supabase — no confiar solo en la cookie porque puede
  // ser de una sesión anterior (cuenta diferente) y causar un loop infinito.
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('clerk_id', userId)
    .single()

  // Solo redirigir al dashboard si Supabase confirma que está completado.
  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
