import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  if (!userId) redirect('/sign-in')

  // Comprobar si el usuario completó el onboarding
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('clerk_id', userId)
    .single()

  // Sin perfil o sin onboarding completado → redirigir al wizard
  if (!profile?.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
