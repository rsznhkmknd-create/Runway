import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import SettingsSubpageHeader from '@/components/settings/SettingsSubpageHeader'
import NotificationsForm from '@/components/settings/NotificationsForm'
import type { NotificationSettings } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Notificaciones · Ajustes' }

const DEFAULT_SETTINGS: NotificationSettings = {
  runway_low: true,
  invoices_overdue: true,
  weekly_summary: true,
  monthly_summary: true,
  expense_spike: true,
}

export default async function NotificacionesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_settings')
    .eq('clerk_id', userId)
    .single()

  const settings: NotificationSettings = profile?.notification_settings ?? DEFAULT_SETTINGS

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubpageHeader
        title="Notificaciones"
        description="Elige qué emails quieres recibir desde Finsight"
      />
      <NotificationsForm initial={settings} />
    </div>
  )
}
