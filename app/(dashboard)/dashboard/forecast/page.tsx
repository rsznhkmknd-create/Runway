import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompanyProfile } from '@/lib/supabase/company-profile'
import ForecastView from '@/components/forecast/ForecastView'
import type { ForecastTx } from '@/lib/forecast/compute'

export const metadata: Metadata = { title: 'Forecast' }

export default async function ForecastPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getCompanyProfile(userId)
  if (!profile?.id) redirect('/onboarding')

  const supabase = createServiceClient()
  // 24 months of history is plenty — the algorithm only needs the last
  // 6 for display + the last 3 completed for averages/growth.
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - 24)
  const cutoffIso = cutoffDate.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, date')
    .eq('profile_id', profile.id)
    .gte('date', cutoffIso)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(`No pudimos cargar tus transacciones: ${error.message}`)
  }

  const transactions: ForecastTx[] = (data ?? []).map((t) => ({
    amount: Number(t.amount),
    type: t.type === 'income' ? 'income' : 'expense',
    date: t.date,
  }))

  return (
    <ForecastView
      transactions={transactions}
      currency={profile.currency ?? 'EUR'}
    />
  )
}
