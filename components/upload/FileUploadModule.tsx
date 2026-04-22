'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColumnMapping } from '@/lib/normalize-transactions'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalyzeResult {
  mapping: ColumnMapping
  columns: string[]
  sampleRows: Record<string, string>[]
  allRows: Record<string, string>[]
  totalRows: number
  filename: string
}

type Step = 'idle' | 'analyzing' | 'mapping' | 'importing' | 'success' | 'error'

const FIELD_LABELS: Record<string, string> = {
  fecha: 'Fecha',
  concepto: 'Concepto / Descripción',
  monto: 'Importe',
  monto_debito: 'Débito / Pago',
  monto_credito: 'Crédito / Cobro',
  tipo: 'Tipo (Ingreso/Gasto)',
  categoria: 'Categoría',
}

const CONFIDENCE_CONFIG = {
  alto:  { label: 'Alta confianza',  classes: 'bg-brand-50 text-brand-700' },
  medio: { label: 'Confianza media', classes: 'bg-amber-50 text-amber-700' },
  bajo:  { label: 'Baja confianza',  classes: 'bg-red-50 text-red-600' },
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FileUploadModule() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [insertedCount, setInsertedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Upload & analyze ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setStep('analyzing')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Error desconocido al analizar el archivo.')
        setStep('error')
        return
      }

      setAnalyzeResult(data as AnalyzeResult)
      setMapping((data as AnalyzeResult).mapping)
      setStep('mapping')
    } catch {
      setErrorMessage('Error de red. Verifica tu conexión e inténtalo de nuevo.')
      setStep('error')
    }
  }, [])

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!analyzeResult || !mapping) return
    setStep('importing')

    try {
      const res = await fetch('/api/upload/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping, rows: analyzeResult.allRows }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Error al importar las transacciones.')
        setStep('error')
        return
      }

      setInsertedCount(data.inserted as number)
      setStep('success')
      // Redirigir al dashboard para que los Server Components refresquen con los datos nuevos
      router.push('/dashboard')
    } catch {
      setErrorMessage('Error de red durante la importación.')
      setStep('error')
    }
  }, [analyzeResult, mapping])

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const reset = () => {
    setStep('idle')
    setAnalyzeResult(null)
    setMapping(null)
    setErrorMessage('')
    setInsertedCount(0)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer select-none',
          isDragging
            ? 'border-brand-400 bg-brand-50'
            : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.ods"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <UploadCloud className={cn('w-12 h-12 mx-auto mb-4', isDragging ? 'text-brand-500' : 'text-gray-300')} />
        <p className="text-base font-semibold text-gray-700 mb-1">
          Arrastra tu archivo aquí o{' '}
          <span className="text-brand-600 underline underline-offset-2">selecciona uno</span>
        </p>
        <p className="text-sm text-gray-400">
          Soporta .xlsx · .xls · .csv · .ods · máx. 10 MB
        </p>
      </div>
    )
  }

  if (step === 'analyzing') {
    return (
      <div className="border border-gray-100 rounded-2xl p-12 text-center bg-white shadow-sm">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-brand-500 animate-spin" />
        <p className="font-semibold text-gray-800 mb-1">Analizando archivo…</p>
        <p className="text-sm text-gray-400">Claude está detectando las columnas automáticamente</p>
      </div>
    )
  }

  if (step === 'importing') {
    return (
      <div className="border border-gray-100 rounded-2xl p-12 text-center bg-white shadow-sm">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-brand-500 animate-spin" />
        <p className="font-semibold text-gray-800 mb-1">Importando transacciones…</p>
        <p className="text-sm text-gray-400">
          Guardando {analyzeResult?.totalRows} filas en Supabase
        </p>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="border border-brand-100 rounded-2xl p-12 text-center bg-brand-50 shadow-sm">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-brand-600" />
        <p className="text-xl font-bold text-gray-900 mb-1">¡Importación completada!</p>
        <p className="text-gray-500 mb-2">
          Se importaron{' '}
          <span className="font-semibold text-brand-700">{insertedCount} transacciones</span>{' '}
          correctamente.
        </p>
        <p className="text-sm text-gray-400">Redirigiendo al dashboard…</p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="border border-red-100 rounded-2xl p-10 bg-white shadow-sm">
        <div className="flex gap-3 items-start mb-6">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 mb-1">No se pudo procesar el archivo</p>
            <p className="text-sm text-gray-600">{errorMessage}</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Intentar con otro archivo
        </button>
      </div>
    )
  }

  // step === 'mapping'
  if (!analyzeResult || !mapping) return null

  const conf = CONFIDENCE_CONFIG[mapping.confidence]
  const columnsForSelect = ['(ninguna)', ...analyzeResult.columns]

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => prev ? { ...prev, [field]: value === '(ninguna)' ? null : value } : prev)
  }

  const keyFields: (keyof ColumnMapping)[] = [
    'fecha', 'concepto', 'monto', 'monto_debito', 'monto_credito', 'tipo', 'categoria',
  ]

  return (
    <div className="space-y-5">
      {/* File info + confidence */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{analyzeResult.filename}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {analyzeResult.totalRows} filas · {analyzeResult.columns.length} columnas
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${conf.classes}`}>
          {conf.label}
        </span>
      </div>

      {/* Notas de Claude */}
      {mapping.notas && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{mapping.notas}</p>
        </div>
      )}

      {/* Column mapping */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Mapeo de columnas</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Claude detectó automáticamente las columnas. Corrígelas si es necesario.
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {keyFields.map((field) => {
            const currentVal = (mapping[field] as string | null) ?? '(ninguna)'
            return (
              <div key={field}>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">
                  {FIELD_LABELS[field]}
                </label>
                <div className="relative">
                  <select
                    value={currentVal}
                    onChange={(e) => updateMapping(field, e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300 text-gray-800"
                  >
                    {columnsForSelect.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sample data preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Vista previa de datos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Primeras 5 filas del archivo</p>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                {analyzeResult.columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {analyzeResult.sampleRows.slice(0, 5).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  {analyzeResult.columns.map((col) => (
                    <td key={col} className="px-4 py-2.5 text-gray-600 whitespace-nowrap max-w-[200px] truncate">
                      {row[col] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={reset}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Cambiar archivo
        </button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">
            Se importarán <span className="font-semibold text-gray-700">{analyzeResult.totalRows}</span> filas
          </p>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Importar transacciones <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
