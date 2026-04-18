import type { Metadata } from 'next'
import { ArrowUpRight, ArrowDownRight, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Movimientos' }

type TxType = 'income' | 'expense'

const transactions: {
  id: number
  description: string
  category: string
  amount: number
  type: TxType
  date: string
}[] = [
  { id: 1,  description: 'Acme Corp — Factura FAC-001',     category: 'Ventas',      amount:  12500, type: 'income',  date: '18 abr 2026' },
  { id: 2,  description: 'Nóminas equipo abril',            category: 'Personal',    amount: -18000, type: 'expense', date: '15 abr 2026' },
  { id: 3,  description: 'Google Workspace',                category: 'SaaS',        amount:   -480, type: 'expense', date: '14 abr 2026' },
  { id: 4,  description: 'TechStart SL — Factura FAC-002',  category: 'Ventas',      amount:   8200, type: 'income',  date: '12 abr 2026' },
  { id: 5,  description: 'Alquiler oficina abril',          category: 'Oficina',     amount:  -2800, type: 'expense', date: '10 abr 2026' },
  { id: 6,  description: 'AWS Infraestructura',             category: 'Tecnología',  amount:  -1240, type: 'expense', date: '08 abr 2026' },
  { id: 7,  description: 'Distribuidora MX — Pago parcial', category: 'Ventas',      amount:   5000, type: 'income',  date: '05 abr 2026' },
  { id: 8,  description: 'Seguridad Social',                category: 'Personal',    amount:  -4200, type: 'expense', date: '04 abr 2026' },
  { id: 9,  description: 'Stripe — comisiones',             category: 'Comisiones',  amount:   -320, type: 'expense', date: '02 abr 2026' },
  { id: 10, description: 'Inversión seed — tramo 2',        category: 'Financiación',amount:  50000, type: 'income',  date: '01 abr 2026' },
]

const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
const net = totalIncome - totalExpense

export default function MovimientosPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-gray-500 mt-1 text-sm">Historial de ingresos y gastos</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-brand-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ingresos</p>
          </div>
          <p className="text-3xl font-bold text-brand-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gastos</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${net >= 0 ? 'bg-brand-50' : 'bg-red-50'}`}>
              {net >= 0
                ? <ArrowUpRight className="w-4 h-4 text-brand-600" />
                : <ArrowDownRight className="w-4 h-4 text-red-500" />}
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Neto</p>
          </div>
          <p className={`text-3xl font-bold ${net >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-900 shrink-0">Transacciones</h2>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
                <p className="text-xs text-gray-400 mt-0.5">{tx.category} · {tx.date}</p>
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
    </div>
  )
}
