import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  // Sin sesión → login
  if (!userId) redirect('/sign-in')

  // Ya completó el onboarding → dashboard
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('clerk_id', userId)
    .single()

  if (profile?.onboarding_completed) redirect('/dashboard')

  return <>{children}</>
}
