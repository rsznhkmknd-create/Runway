import type { Metadata } from 'next'
import AlertsList from '@/components/alerts/AlertsList'

export const metadata: Metadata = { title: 'Alertas' }

export default function AlertasPage() {
  // Alerts themselves come from the <AlertsProvider> in the dashboard layout,
  // which computes them server-side from the user's current Supabase data on
  // every navigation. The list component below reads from that context.
  return <AlertsList />
}
