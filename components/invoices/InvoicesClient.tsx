'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import InvoiceModal from './InvoiceModal'

export type Invoice = {
  id:          string
  client_name: string
  amount:      number | string
  currency:    string
  due_date:    string
  status:      'paid' | 'pending' | 'overdue'
  created_at:  string
}

type Status = Invoice['status']

const statusConfig: Record<
  Status,
  { label: string; classes: string; icon: typeof CheckCircle2 }
> = {
  paid:    { label: 'Cobrada',   classes: 'bg-brand-50 text-brand-700', icon: CheckCircle2 },
  pending: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700', icon: Clock },
  overdue: { label: 'Vencida',   classes: 'bg-red-50 text-red-600',     icon: AlertCircle },
}

type Props = {
  initialInvoices: Invoice[]
}

export default function InvoicesClient({ initialInvoices }: Props) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [modalOpen, setModalOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [_, startTransition] = useTransition()

  const totals = useMemo(() => {
    const pending = invoices
      .filter((i) => i.status === 'pending')
      .reduce((s, i) => s + Number(i.amount), 0)
    const overdue = invoices
      .filter((i) => i.status === 'overdue')
      .reduce((s, i) => s + Number(i.amount), 0)
    const paid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.amount), 0)
    return { pending, overdue, paid }
  }, [invoices])

  const refresh = async () => {
    setModalOpen(false)
    try {
      const res = await fetch('/api/invoices', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setInvoices(json.invoices as Invoice[])
    } catch {
      // fall back to server refresh
    }
    startTransition(() => router.refresh())
  }

  const markPaid = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'paid' } : i))
        )
      }
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => i.id !== id))
      }
    } finally {
      setBusyId(null)
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (invoices.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
            <p className="text-gray-500 mt-1 text-sm">Gestión de cuentas por cobrar</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
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
            Añade facturas manualmente o sube un PDF/imagen para extraer los datos automáticamente.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva factura
            </button>
            <Link
              href="/dashboard/importar"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-white transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importar transacciones
            </Link>
          </div>
        </div>

        <InvoiceModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={refresh}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestión de cuentas por cobrar</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva factura
        </button>
      </div>

      {/* Totales: pendiente · vencido · cobrado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total pendiente"
          value={totals.pending}
          bg="bg-amber-50"
          text="text-amber-700"
          Icon={Clock}
        />
        <MetricCard
          label="Total vencido"
          value={totals.overdue}
          bg="bg-red-50"
          text="text-red-600"
          Icon={AlertCircle}
        />
        <MetricCard
          label="Total cobrado"
          value={totals.paid}
          bg="bg-brand-50"
          text="text-brand-700"
          Icon={CheckCircle2}
        />
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
                {['Cliente', 'Importe', 'Vencimiento', 'Estado', ''].map((h) => (
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
                const s = statusConfig[inv.status]
                const Icon = s.icon
                const isBusy = busyId === inv.id
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
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                          s.classes
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => markPaid(inv.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Marcar como pagada"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Marcar pagada
                          </button>
                        )}
                        <button
                          onClick={() => remove(inv.id)}
                          disabled={isBusy}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar factura"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refresh}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  bg,
  text,
  Icon,
}: {
  label: string
  value: number
  bg: string
  text: string
  Icon: typeof CheckCircle2
}) {
  return (
    <div className={cn(bg, 'rounded-2xl p-5')}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon className={cn('w-4 h-4', text)} />
      </div>
      <p className={cn('text-2xl font-bold', text)}>{formatCurrency(value)}</p>
    </div>
  )
}
