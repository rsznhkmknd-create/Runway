'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'

type Props = {
  summary: {
    invoices: number
    transactions: number
    reports: number
  }
}

const CONFIRM_WORD = 'ELIMINAR'

export default function DeleteAccountCard({ summary }: Props) {
  const router = useRouter()
  const toast = useToast()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const matches = value === CONFIRM_WORD

  const close = () => {
    if (submitting) return
    setOpen(false)
    setValue('')
  }

  const handleDelete = async () => {
    if (!matches || submitting) return
    setSubmitting(true)
    try {
      await fetchJson('/api/settings/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: CONFIRM_WORD }),
      })
      toast.success('Cuenta eliminada. Cerrando sesión…')
      await signOut()
      router.push('/')
    } catch (err) {
      const message =
        err instanceof FetchJsonError ? err.message : 'No se pudo eliminar la cuenta'
      toast.error(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-red-200 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-red-600">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-700">Eliminar cuenta</h2>
            <p className="text-xs text-text-muted mt-0.5 max-w-md">
              Esto borra permanentemente tu perfil, facturas, transacciones, reportes e insights.
              No se puede deshacer.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar mi cuenta
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              disabled={submitting}
              aria-label="Cerrar"
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h2 className="text-lg font-semibold text-text-primary mb-2">
              ¿Eliminar tu cuenta de Finsight?
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Se eliminarán de forma permanente:
            </p>
            <ul className="text-sm text-text-primary space-y-1 mb-4 list-disc ml-5">
              <li>Tu perfil y configuración de empresa</li>
              <li>{summary.invoices} factura{summary.invoices === 1 ? '' : 's'}</li>
              <li>{summary.transactions} transaccion{summary.transactions === 1 ? '' : 'es'}</li>
              <li>{summary.reports} reporte{summary.reports === 1 ? '' : 's'} generados</li>
              <li>Todo el historial de actividad e insights</li>
            </ul>
            <p className="text-sm text-text-muted mb-2">
              Escribe <span className="font-mono font-semibold text-red-600">{CONFIRM_WORD}</span>{' '}
              para confirmar:
            </p>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              placeholder={CONFIRM_WORD}
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-surface-2 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-colors font-mono mb-5"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="flex-1 text-sm font-medium text-text-secondary border border-border px-4 py-2.5 rounded-xl hover:bg-surface-2 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!matches || submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
