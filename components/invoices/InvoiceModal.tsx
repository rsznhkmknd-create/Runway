'use client'

import { useCallback, useRef, useState } from 'react'
import {
  X,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  FilePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'manual' | 'upload'

type FormState = {
  client_name: string
  amount: string
  currency: string
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
}

const EMPTY: FormState = {
  client_name: '',
  amount: '',
  currency: 'EUR',
  due_date: '',
  status: 'pending',
}

const CURRENCIES = ['EUR', 'USD', 'MXN', 'COP', 'ARS', 'CLP', 'GBP']

const STATUS_OPTIONS: Array<{ value: FormState['status']; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid',    label: 'Pagada'    },
  { value: 'overdue', label: 'Vencida'   },
]

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function InvoiceModal({ open, onClose, onCreated }: Props) {
  const [tab, setTab]         = useState<Tab>('manual')
  const [form, setForm]       = useState<FormState>(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // upload state
  const [extracting, setExtracting] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [extractedOk, setExtractedOk] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const resetAll = useCallback(() => {
    setForm(EMPTY)
    setError('')
    setExtracting(false)
    setUploadedName(null)
    setExtractedOk(false)
    setSaving(false)
    setTab('manual')
  }, [])

  const handleClose = () => {
    if (saving || extracting) return
    resetAll()
    onClose()
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // ── Upload flow ────────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setError('')
    setExtracting(true)
    setUploadedName(file.name)
    setExtractedOk(false)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch('/api/invoices/extract', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al extraer datos')

      const e = json.extracted as {
        client_name: string | null
        amount: number | null
        currency: string | null
        due_date: string | null
      }

      setForm({
        client_name: e.client_name ?? '',
        amount:      e.amount != null ? String(e.amount) : '',
        currency:    e.currency && CURRENCIES.includes(e.currency) ? e.currency : 'EUR',
        due_date:    e.due_date ?? '',
        status:      'pending',
      })
      setExtractedOk(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
      setUploadedName(null)
    } finally {
      setExtracting(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const canSubmit =
    form.client_name.trim() !== '' &&
    form.amount.trim() !== '' &&
    !Number.isNaN(Number(form.amount)) &&
    Number(form.amount) > 0 &&
    form.due_date.trim() !== ''

  const handleSave = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/invoices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: form.client_name,
          amount:      Number(form.amount),
          currency:    form.currency,
          due_date:    form.due_date,
          status:      form.status,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

      resetAll()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  if (!open) return null

  const showForm = tab === 'manual' || extractedOk

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Nueva factura</h2>
          <button
            onClick={handleClose}
            disabled={saving || extracting}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-1 border-b border-gray-100">
          {([
            { id: 'manual', label: 'Manual',       Icon: FilePlus },
            { id: 'upload', label: 'Subir archivo', Icon: Upload },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
                tab === id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Upload tab — file picker / progress (only when not yet extracted) */}
          {tab === 'upload' && !extractedOk && (
            <div>
              {extracting ? (
                <div className="rounded-xl bg-brand-50 border border-brand-100 p-6 text-center">
                  <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-brand-700">Analizando factura</p>
                  <p className="text-xs text-brand-600/80 mt-1 truncate">{uploadedName}</p>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={() => fileInput.current?.click()}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 px-6 py-10 text-center transition-colors"
                  >
                    <div className="mx-auto w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-brand-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      Arrastra una factura o haz clic para buscar
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG · máx. 10MB</p>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                      e.target.value = ''
                    }}
                  />
                  <div className="mt-4 flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
                    <Sparkles className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Claude extraerá automáticamente cliente, importe, fecha y número de factura.
                      Podrás revisarlos antes de guardar.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Form (shared: manual tab always, upload tab after extraction) */}
          {showForm && (
            <div className="space-y-4">
              {tab === 'upload' && extractedOk && uploadedName && (
                <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 text-xs text-brand-700">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="font-medium truncate">{uploadedName}</span>
                  <span className="ml-auto text-brand-600/70">Datos extraídos — revísalos</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => update('client_name', e.target.value)}
                  placeholder="Ej. Acme Corp"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => update('amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => update('currency', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors appearance-none cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => update('due_date', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Estado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('status', opt.value)}
                      className={cn(
                        'px-3 py-2 text-sm font-medium rounded-xl border-2 transition-colors',
                        form.status === opt.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {showForm && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit || saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar factura'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
