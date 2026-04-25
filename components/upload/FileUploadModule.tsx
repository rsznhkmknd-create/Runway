'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'
import type { NormalizedTransaction } from '@/lib/normalize-transactions'
import ImportReview, {
  type ReviewSummary,
  type StagingReviewRow,
} from '@/components/upload/ImportReview'

interface AnalyzeResult {
  filename: string
  totalRows?: number
  totalTransactions: number
  preview: NormalizedTransaction[]
  transactions: NormalizedTransaction[]
  warnings: string[]
  // New shape from /api/upload/analyze (Prompt 5)
  importId?: string
  autoConfirmed?: boolean
  inserted?: number
  summary?: ReviewSummary
  needsReviewRows?: StagingReviewRow[]
}

type Step = 'idle' | 'analyzing' | 'preview' | 'review' | 'importing' | 'success' | 'error'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTS = ['.xlsx', '.xls', '.csv', '.ods']
const ANALYZE_TIMEOUT_MS = 30_000
const IMPORT_TIMEOUT_MS  = 60_000

export default function FileUploadModule() {
  const router = useRouter()
  const toast  = useToast()
  const [step, setStep] = useState<Step>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [insertedCount, setInsertedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('idle')
    setResult(null)
    setErrorMessage('')
    setInsertedCount(0)
  }

  const handleFile = useCallback(async (file: File) => {
    // ── Client-side validations (cheap fail-fast) ──────────────────────
    if (file.size === 0) {
      setErrorMessage('El archivo está vacío.')
      setStep('error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('El archivo supera el límite de 10 MB.')
      setStep('error')
      return
    }
    const lower = file.name.toLowerCase()
    if (!ALLOWED_EXTS.some((ext) => lower.endsWith(ext))) {
      setErrorMessage(`Formato no soportado. Usa: ${ALLOWED_EXTS.join(', ')}`)
      setStep('error')
      return
    }

    setStep('analyzing')
    setErrorMessage('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await fetchJson<AnalyzeResult>('/api/upload/analyze', {
        method:    'POST',
        body:      formData,
        timeoutMs: ANALYZE_TIMEOUT_MS,
      })
      setResult(data)
      // New flow: when the analyze response was auto-confirmed, the rows
      // already landed in `transactions`. Skip the review screen and show
      // the success state directly — preserves the UX for clean files.
      if (data.autoConfirmed) {
        setInsertedCount(data.inserted ?? data.totalTransactions)
        setStep('success')
        toast.success(`${data.inserted ?? data.totalTransactions} transacciones importadas correctamente.`)
        setTimeout(() => router.push('/dashboard'), 1200)
        return
      }
      // Multi-region or low-confidence file → user reviews before import.
      if (data.importId && data.summary && data.needsReviewRows) {
        setStep('review')
        return
      }
      // Fallback for the old response shape (kept temporarily until staging
      // is everywhere). Should never trigger after the route refactor lands.
      setStep('preview')
    } catch (err) {
      let message = 'Error al analizar el archivo.'
      if (err instanceof FetchJsonError) {
        if (err.kind === 'timeout') {
          message = 'Claude tardó demasiado en analizar el archivo (más de 30s). Inténtalo de nuevo.'
        } else {
          message = err.message
        }
      }
      setErrorMessage(message)
      setStep('error')
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!result || step === 'importing') return
    setStep('importing')
    setErrorMessage('')

    try {
      const data = await fetchJson<{ inserted: number; total: number }>(
        '/api/upload/import',
        {
          method:    'POST',
          headers:   { 'Content-Type': 'application/json' },
          body:      JSON.stringify({ transactions: result.transactions }),
          timeoutMs: IMPORT_TIMEOUT_MS,
        }
      )
      setInsertedCount(data.inserted)
      setStep('success')
      toast.success(`${data.inserted} transacciones importadas correctamente.`)
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch (err) {
      const message =
        err instanceof FetchJsonError
          ? err.kind === 'timeout'
            ? 'La importación tardó demasiado. Inténtalo de nuevo.'
            : err.message
          : 'Error durante la importación.'
      setErrorMessage(message)
      setStep('error')
    }
  }, [result, router, toast, step])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  // ── idle ─────────────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer select-none',
          isDragging
            ? 'border-brand-400 bg-brand-50'
            : 'border-border hover:border-brand-300 hover:bg-surface-2'
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
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        <UploadCloud
          className={cn(
            'w-12 h-12 mx-auto mb-4',
            isDragging ? 'text-brand-500' : 'text-text-muted'
          )}
        />
        <p className="text-base font-semibold text-text-secondary mb-1">
          Arrastra tu archivo aquí o{' '}
          <span className="text-brand-600 underline underline-offset-2">selecciona uno</span>
        </p>
        <p className="text-sm text-text-muted">
          Claude detectará las columnas automáticamente · .xlsx · .xls · .csv · .ods · máx. 10 MB
        </p>
      </div>
    )
  }

  // ── analyzing ────────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <div className="border border-border rounded-2xl p-12 text-center bg-surface shadow-sm">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-brand-500 animate-spin" />
        <p className="font-semibold text-text-primary mb-1">Analizando archivo…</p>
        <p className="text-sm text-text-muted">
          Claude está leyendo las columnas, evaluando fórmulas e infiriendo categorías
        </p>
      </div>
    )
  }

  // ── review (multi-region or low-confidence) ─────────────────────────────
  if (step === 'review' && result?.importId && result.summary && result.needsReviewRows) {
    return (
      <ImportReview
        importId={result.importId}
        summary={result.summary}
        needsReviewRows={result.needsReviewRows}
        onConfirm={() => {
          setStep('success')
          setInsertedCount(result.summary?.transactions ?? 0)
          setTimeout(() => router.push('/dashboard'), 1200)
        }}
        onCancel={() => reset()}
      />
    )
  }

  // ── importing ────────────────────────────────────────────────────────────
  if (step === 'importing') {
    return (
      <div className="border border-border rounded-2xl p-12 text-center bg-surface shadow-sm">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-brand-500 animate-spin" />
        <p className="font-semibold text-text-primary mb-1">Importando transacciones…</p>
        <p className="text-sm text-text-muted">
          Guardando {result?.totalTransactions} transacciones
        </p>
      </div>
    )
  }

  // ── success ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="border border-brand-100 rounded-2xl p-12 text-center bg-brand-50 shadow-sm">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-brand-600" />
        <p className="text-xl font-bold text-text-primary mb-1">¡Importación completada!</p>
        <p className="text-text-muted mb-2">
          Se importaron{' '}
          <span className="font-semibold text-brand-700">{insertedCount} transacciones</span>{' '}
          correctamente.
        </p>
        <p className="text-sm text-text-muted">Redirigiendo al dashboard…</p>
      </div>
    )
  }

  // ── error ────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="border border-red-100 rounded-2xl p-10 bg-surface shadow-sm">
        <div className="flex gap-3 items-start mb-6">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 mb-1">No se pudo procesar el archivo</p>
            <p className="text-sm text-text-secondary">{errorMessage}</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 border border-border text-text-secondary hover:bg-surface-2 font-medium px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Intentar con otro archivo
        </button>
      </div>
    )
  }

  // ── preview ──────────────────────────────────────────────────────────────
  if (!result) return null

  return (
    <div className="space-y-5">
      {/* File summary */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">{result.filename}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {result.totalRows} filas leídas ·{' '}
              <span className="font-semibold text-brand-700">{result.totalTransactions}</span>{' '}
              transacciones detectadas
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3 h-3" />
          Detectadas por Claude
        </span>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">Vista previa — primeras 5 transacciones</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Revisa los datos antes de confirmar la importación
          </p>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.preview.map((tx, i) => (
                <tr key={i} className="hover:bg-surface-2/50">
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">
                    {tx.description}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.type === 'income' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Gasto
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 font-semibold whitespace-nowrap',
                      tx.type === 'income' ? 'text-brand-700' : 'text-text-primary'
                    )}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                    {formatCurrency(tx.amount)}
                  </td>
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
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Cancelar y subir otro archivo
        </button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-text-muted">
            Se importarán{' '}
            <span className="font-semibold text-text-secondary">{result.totalTransactions}</span>{' '}
            transacciones
          </p>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Confirmar importación <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
