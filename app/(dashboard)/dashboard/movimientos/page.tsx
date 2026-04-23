import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { Upload } from 'lucide-react'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import MovimientosList from '@/components/dashboard/MovimientosList'

export const metadata: Metadata = { title: 'Movimientos' }

export default async function MovimientosPage() {
  const { userId } = await auth()
  const supabase   = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  if (!profile?.id) return <EmptyState />

  const { data: rawTransactions } = await supabase
    .from('transactions')
    .select('id, amount, type, category, description, date')
    .eq('profile_id', profile.id)
    .order('date', { ascending: false })

  const transactions = rawTransactions ?? []

  if (transactions.length === 0) return <EmptyState />

  const totalIncome  = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <MovimientosList
      transactions={transactions}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
    />
  )
}

function EmptyState() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Movimientos</h1>
        <p className="text-text-muted mt-1 text-sm">Historial de ingresos y gastos</p>
      </div>
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-8 py-16 text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
          <Upload className="w-6 h-6 text-brand-600" />
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Sin movimientos registrados</h2>
        <p className="text-sm text-text-muted max-w-xs mx-auto leading-relaxed mb-6">
          Importa tu primer archivo para ver el historial completo de ingresos y gastos.
        </p>
        <Link
          href="/dashboard/importar"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar transacciones
        </Link>
      </div>
    </div>
  )
}
