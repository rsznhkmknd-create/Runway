import type { Metadata } from 'next'
import { FileText, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Facturas' }

type Status = 'paid' | 'pending' | 'overdue'

const invoices: {
  id: string
  client: string
  concept: string
  amount: number
  issued: string
  due: string
  status: Status
}[] = [
  { id: 'FAC-001', client: 'Acme Corp', concept: 'Desarrollo Q1', amount: 12500, issued: '01/03/2026', due: '31/03/2026', status: 'paid' },
  { id: 'FAC-002', client: 'TechStart SL', concept: 'Consultoría estratégica', amount: 8200, issued: '15/03/2026', due: '14/04/2026', status: 'paid' },
  { id: 'FAC-003', client: 'Innovatech', concept: 'Integración API', amount: 5800, issued: '01/04/2026', due: '30/04/2026', status: 'pending' },
  { id: 'FAC-004', client: 'Distribuidora MX', concept: 'Soporte anual', amount: 14400, issued: '05/04/2026', due: '05/05/2026', status: 'pending' },
  { id: 'FAC-005', client: 'FinGroup ES', concept: 'Auditoría financiera', amount: 7600, issued: '10/02/2026', due: '10/03/2026', status: 'overdue' },
  { id: 'FAC-006', client: 'RetailPro', concept: 'Licencias software', amount: 4800, issued: '20/02/2026', due: '20/03/2026', status: 'overdue' },
]

const statusConfig: Record<Status, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
  paid:    { label: 'Cobrada',  classes: 'bg-brand-50 text-brand-700', icon: CheckCircle2 },
  pending: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700', icon: Clock },
  overdue: { label: 'Vencida',  classes: 'bg-red-50 text-red-600',    icon: AlertCircle },
}

const total     = invoices.reduce((s, i) => s + i.amount, 0)
const paid      = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
const pending   = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
const overdue   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

export default function FacturasPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestión de cuentas por cobrar</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Nueva factura
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total emitido', value: total, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Cobrado', value: paid, color: 'text-brand-700', bg: 'bg-brand-50' },
          { label: 'Pendiente', value: pending, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Vencido', value: overdue, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-5`}>
            <p className="text-xs font-medium text-gray-500 mb-2">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Todas las facturas</h2>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{invoices.length} facturas</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Nº', 'Cliente', 'Concepto', 'Importe', 'Emisión', 'Vencimiento', 'Estado'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const s = statusConfig[inv.status]
                const Icon = s.icon
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{inv.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{inv.client}</td>
                    <td className="px-6 py-4 text-gray-500">{inv.concept}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{inv.issued}</td>
                    <td className="px-6 py-4 text-gray-500">{inv.due}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.classes}`}
                      >
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
