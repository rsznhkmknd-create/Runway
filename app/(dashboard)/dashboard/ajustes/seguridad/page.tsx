import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import SettingsSubpageHeader from '@/components/settings/SettingsSubpageHeader'
import ActiveSessionsList from '@/components/settings/ActiveSessionsList'
import TwoFactorSection from '@/components/settings/TwoFactorSection'
import ActivityLogTable from '@/components/settings/ActivityLogTable'
import DataExportCard from '@/components/settings/DataExportCard'
import DeleteAccountCard from '@/components/settings/DeleteAccountCard'

export const metadata: Metadata = { title: 'Seguridad · Ajustes' }

export default async function SeguridadPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!profile) redirect('/sign-in')

  const [logsRes, invoicesCountRes, transactionsCountRes, reportsCountRes] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id),
  ])

  const logs = logsRes.data ?? []
  const summary = {
    invoices: invoicesCountRes.count ?? 0,
    transactions: transactionsCountRes.count ?? 0,
    reports: reportsCountRes.count ?? 0,
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsSubpageHeader
        title="Seguridad"
        description="Gestiona tus sesiones, 2FA y datos de cuenta"
      />

      <TwoFactorSection />
      <ActiveSessionsList />
      <ActivityLogTable logs={logs} />

      <div className="pt-2">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Datos de tu cuenta</h2>
        <div className="space-y-4">
          <DataExportCard />
          <DeleteAccountCard summary={summary} />
        </div>
      </div>
    </div>
  )
}
