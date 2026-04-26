import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'

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

/**
 * Stable colour assignment for arbitrary user-defined categories.
 * Hash the string and pick from a small palette so the same category
 * gets the same pill colour across renders.
 */
const CATEGORY_PALETTE = [
  'bg-mint/10 text-mint',
  'bg-amber/10 text-amber',
  'bg-blue-500/10 text-blue-500',
  'bg-purple-500/10 text-purple-500',
  'bg-pink-500/10 text-pink-500',
  'bg-cyan-500/10 text-cyan-500',
] as const

function colorForCategory(category: string): string {
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i)
    hash |= 0
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length]!
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function RecentTransactions({ transactions, currency }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Movimientos</h3>
            <p className="text-sm text-text-muted">Tu última actividad financiera</p>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-text-muted">
          Sin movimientos aún
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  Descripción
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  Categoría
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                  Importe
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="text-sm font-medium text-text-primary">
                      {tx.description ?? tx.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        colorForCategory(tx.category)
                      )}
                    >
                      {tx.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <span
                      className={cn(
                        'tabular-nums text-sm font-semibold',
                        tx.type === 'income' ? 'text-income' : 'text-expense'
                      )}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <span className="text-sm text-text-muted">{formatDate(tx.date)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-border p-4">
        <Link
          href="/dashboard/movimientos"
          className="block w-full text-center text-sm font-medium text-mint transition-colors hover:text-mint-dark"
        >
          Ver todos los movimientos
        </Link>
      </div>
    </div>
  )
}
