import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { AlertsProvider } from '@/components/alerts/AlertsProvider'
import { computeAlerts } from '@/lib/alerts/compute'
import type { Alert } from '@/lib/alerts/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, currency, onboarding_completed')
    .eq('clerk_id', userId)
    .single()

  if (!profile?.onboarding_completed) {
    redirect('/onboarding')
  }

  // ── Compute alerts from current data ──────────────────────────────────
  // These are re-computed on every navigation because this is a server
  // layout. Dismissal state lives in the client (localStorage).
  let alerts: Alert[] = []
  if (profile.id) {
    const [txRes, invRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, type, date, category')
        .eq('profile_id', profile.id),
      supabase
        .from('invoices')
        .select('amount, currency, due_date, status')
        .eq('profile_id', profile.id),
    ])
    if (!txRes.error && !invRes.error) {
      alerts = computeAlerts(
        txRes.data ?? [],
        invRes.data ?? [],
        profile.currency
      )
    }
    // If the queries error out we silently render zero alerts rather than
    // taking the whole dashboard down — the rest of the app still works.
  }

  return (
    <AlertsProvider alerts={alerts}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AlertsProvider>
  )
}
