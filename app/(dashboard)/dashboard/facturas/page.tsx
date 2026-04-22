import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import InvoicesClient, { type Invoice } from '@/components/invoices/InvoicesClient'

export const metadata: Metadata = { title: 'Facturas' }

export default async function FacturasPage() {
  const { userId } = await auth()
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  const invoices: Invoice[] = profile?.id
    ? (
        (await supabase
          .from('invoices')
          .select('id, client_name, amount, currency, due_date, status, created_at')
          .eq('profile_id', profile.id)
          .order('due_date', { ascending: false })
        ).data as Invoice[] | null
      ) ?? []
    : []

  return <InvoicesClient initialInvoices={invoices} />
}
