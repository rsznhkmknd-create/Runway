import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const transactions = [
  { id: 1, description: 'Cliente Acme Corp', amount: 12500, type: 'income', date: '18 abr', category: 'Ventas' },
  { id: 2, description: 'Nóminas equipo', amount: -18000, type: 'expense', date: '15 abr', category: 'Personal' },
  { id: 3, description: 'Google Workspace', amount: -480, type: 'expense', date: '14 abr', category: 'SaaS' },
  { id: 4, description: 'Cliente TechStart', amount: 8200, type: 'income', date: '12 abr', category: 'Ventas' },
  { id: 5, description: 'Alquiler oficina', amount: -2800, type: 'expense', date: '10 abr', category: 'Oficina' },
  { id: 6, description: 'AWS Infraestructura', amount: -1240, type: 'expense', date: '08 abr', category: 'Tech' },
]

export default function RecentTransactions() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">Movimientos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Últimas transacciones</p>
        </div>
        <button className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Ver todos →
        </button>
      </div>

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
              <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
              <p className="text-xs text-gray-400">{tx.category} · {tx.date}</p>
            </div>
            <span
              className={`text-sm font-semibold shrink-0 ${
                tx.type === 'income' ? 'text-brand-700' : 'text-gray-700'
              }`}
            >
              {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
