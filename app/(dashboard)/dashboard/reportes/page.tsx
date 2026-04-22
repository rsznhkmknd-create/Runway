import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import ReportsClient from '@/components/reports/ReportsClient'
import type { ReportRow } from '@/lib/reports/types'

export const metadata: Metadata = { title: 'Reportes' }

export default async function ReportesPage() {
  const { userId } = await auth()
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  const reports: ReportRow[] = profile?.id
    ? ((
        await supabase
          .from('reports')
          .select('id, type, period_start, period_end, content, created_at')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })
      ).data as ReportRow[] | null) ?? []
    : []

  return <ReportsClient initialReports={reports} />
}
