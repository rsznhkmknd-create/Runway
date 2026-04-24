import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface RecentTransaction {
  id: string
  description: string | null
  amount: number
  type: 'income' | 'expense'
  date: string
  category: string
}

interface Props {
  transactions: RecentTransaction[]
  currency: string
}

export default function RecentTransactions({ transactions, currency }: Props) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-text-primary">Movimientos</h2>
          <p className="text-xs text-text-muted mt-0.5">Últimas transacciones</p>
        </div>
        <Link
          href="/dashboard/movimientos"
          className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-sm text-text-muted">
          Sin movimientos aún
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  tx.type === 'income' ? 'bg-brand-50' : 'bg-red-50'
                }`}
              >
                {tx.type === 'income' ? (
                  <ArrowUpRight className="w-4 h-4 text-brand-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {tx.description ?? tx.category}
                </p>
                <p className="text-xs text-text-muted">
                  {tx.category} ·{' '}
                  {new Date(tx.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <span
                className={`text-sm font-semibold shrink-0 ${
                  tx.type === 'income' ? 'text-brand-700' : 'text-text-secondary'
                }`}
              >
                {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
