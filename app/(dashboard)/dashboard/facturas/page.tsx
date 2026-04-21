import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { FileText, CheckCircle2, Clock, AlertCircle, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Facturas' }

type Status = 'paid' | 'pending' | 'overdue'

const statusConfig: Record<Status, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
  paid:    { label: 'Cobrada',   classes: 'bg-brand-50 text-brand-700', icon: CheckCircle2 },
  pending: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700', icon: Clock },
  overdue: { label: 'Vencida',   classes: 'bg-red-50 text-red-600',    icon: AlertCircle },
}

export default async function FacturasPage() {
  const { userId } = await auth()
  const supabase   = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId!)
    .single()

  const invoices = profile?.id
    ? (await supabase
        .from('invoices')
        .select('id, client_name, amount, currency, due_date, status, created_at')
        .eq('profile_id', profile.id)
        .order('due_date', { ascending: false })
      ).data ?? []
    : []

  if (invoices.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
            <p className="text-gray-500 mt-1 text-sm">Gestión de cuentas por cobrar</p>
          </div>
          <button
            disabled
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl opacity-50 cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Nueva factura
          </button>
        </div>
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-8 py-16 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Sin facturas registradas</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed mb-6">
            Las facturas aparecerán aquí cuando importes transacciones, o cuando las añadas manualmente.
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

  const total   = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const paid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

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
          { label: 'Total emitido', value: total,   color: 'text-gray-900',  bg: 'bg-gray-50' },
          { label: 'Cobrado',       value: paid,    color: 'text-brand-700', bg: 'bg-brand-50' },
          { label: 'Pendiente',     value: pending, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Vencido',       value: overdue, color: 'text-red-600',   bg: 'bg-red-50' },
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
                {['Cliente', 'Importe', 'Vencimiento', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const s    = statusConfig[inv.status as Status]
                const Icon = s.icon
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{inv.client_name}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatCurrency(Number(inv.amount), inv.currency)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(inv.due_date).toLocaleDateString('es-ES', {
                        day:   'numeric',
                        month: 'short',
                        year:  'numeric',
                      })}
                    </td>
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
