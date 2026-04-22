import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import ReportView from '@/components/reports/ReportView'
import type { ReportRow } from '@/lib/reports/types'

export const metadata: Metadata = { title: 'Reporte' }

export default async function ReporteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { userId } = await auth()
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  if (!profile?.id) notFound()

  const { data: report } = await supabase
    .from('reports')
    .select('id, type, period_start, period_end, content, created_at')
    .eq('id', params.id)
    .eq('profile_id', profile.id)
    .single()

  if (!report) notFound()

  return <ReportView report={report as ReportRow} />
}
