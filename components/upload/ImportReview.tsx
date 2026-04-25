'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'

// ── Types matching the analyze response ─────────────────────────────────────

export type ReviewBlock = { type: string; count: number; rowsExtracted: number }

export type ReviewSummary = {
  transactions: number
  needsReview: number
  skipped: number
  receivables: number
  loans: number
  blocks: ReviewBlock[]
}

export type StagingReviewRow = {
  /** id assigned by the analyze response (tempId until we re-fetch real ids) */
  id: string
  amount: number | null
  type: 'income' | 'expense' | null
  category: string | null
  description: string | null
  date: string | null
  review_flags: { reason?: string } | null
  raw_row: Record<string, unknown>
  region_id?: string | null
  block_type?: string | null
}

type Props = {
  importId: string
  summary: ReviewSummary
  needsReviewRows: StagingReviewRow[]
  onConfirm: () => void
  onCancel: () => void
}

// ── Block-type human labels ─────────────────────────────────────────────────

const BLOCK_LABEL: Record<string, string> = {
  income_transactions: 'Ingresos',
  expense_transactions: 'Gastos',
  recurring_expenses: 'Gastos recurrentes',
  accounts_receivable: 'Cuentas por cobrar',
  loans_payable: 'Préstamos',
  inventory_snapshot: 'Inventario',
  summary_totals: 'Totales / resumen',
  notes_other: 'Notas',
  unknown: 'Sin clasificar',
  single_region: 'Tabla única',
}

const BLOCK_NOTE: Record<string, string | null> = {
  inventory_snapshot: 'omitido (no son transacciones)',
  summary_totals: 'omitido',
  notes_other: 'omitido',
  unknown: 'omitido',
  accounts_receivable: 'detectado (próximamente)',
  loans_payable: 'detectado (próximamente)',
  income_transactions: null,
  expense_transactions: null,
  recurring_expenses: null,
  single_region: null,
}

// ── Review-flag helpers ─────────────────────────────────────────────────────

function flagLabel(reason: string | undefined, raw: Record<string, unknown>): {
  badge: string
  tooltip: string
} {
  switch (reason) {
    case 'suspicious_year':
      return {
        badge: 'Año fuera de rango',
        tooltip:
          'El año detectado está fuera del rango del archivo. Posible typo — revisa la fecha.',
      }
    case 'amount_unparseable':
      return {
        badge: 'Monto no numérico',
        tooltip: `El monto original era "${formatRaw(raw)}". Revisa y escribe el número.`,
      }
    case 'date_unparseable':
      return {
        badge: 'Fecha no reconocida',
        tooltip: `La fecha original era "${formatRaw(raw)}". Escribe DD/MM/AAAA.`,
      }
    case 'recurring_needs_date':
      return {
        badge: 'Sin fecha (recurrente)',
        tooltip:
          'Este gasto se repite cada mes — indica desde qué fecha empieza a contar.',
      }
    case 'missing_type_signal':
      return {
        badge: 'Tipo no detectado',
        tooltip: 'No pudimos inferir si es ingreso o gasto. Indícalo manualmente.',
      }
    default:
      return { badge: reason ?? 'Revisar', tooltip: 'Revisa esta fila antes de importar.' }
  }
}

function formatRaw(raw: Record<string, unknown>): string {
  const vals = Object.values(raw).filter((v) => v !== null && v !== '' && v !== undefined)
  return vals.length ? String(vals[0]).slice(0, 40) : '(vacío)'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportReview({
  importId,
  summary,
  needsReviewRows,
  onConfirm,
  onCancel,
}: Props) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(true)

  // Split needsReview rows: recurring → its own collapsible section, rest → table.
  const recurringRows = useMemo(
    () => needsReviewRows.filter((r) => r.review_flags?.reason === 'recurring_needs_date'),
    [needsReviewRows]
  )
  const otherRows = useMemo(
    () => needsReviewRows.filter((r) => r.review_flags?.reason !== 'recurring_needs_date'),
    [needsReviewRows]
  )

  // Editable state — keyed by row id. Approval state separate.
  const [edits, setEdits] = useState<Record<string, Partial<StagingReviewRow>>>({})
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())

  function patchRow(id: string, patch: Partial<StagingReviewRow>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  function approveAll(rows: StagingReviewRow[]) {
    setApprovedIds((prev) => {
      const next = new Set(prev)
      for (const r of rows) next.add(r.id)
      return next
    })
  }

  function discardAll(rows: StagingReviewRow[]) {
    setApprovedIds((prev) => {
      const next = new Set(prev)
      for (const r of rows) next.delete(r.id)
      return next
    })
  }

  // "Apply this date to all recurring rows" — used by the global buttons.
  function setRecurringDate(date: string) {
    setEdits((prev) => {
      const next = { ...prev }
      for (const r of recurringRows) {
        next[r.id] = { ...next[r.id], date }
      }
      return next
    })
    approveAll(recurringRows)
  }

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    try {
      const editsPayload = Object.entries(edits)
        .filter(([id]) => approvedIds.has(id))
        .map(([id, patch]) => ({
          id,
          patch: {
            ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
            ...(patch.type !== undefined && patch.type !== null ? { type: patch.type } : {}),
            ...(patch.category !== undefined && patch.category !== null
              ? { category: patch.category }
              : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.date !== undefined && patch.date !== null ? { date: patch.date } : {}),
          },
        }))

      const data = await fetchJson<{ inserted: number; total: number }>(
        `/api/import/${importId}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvedReviewIds: Array.from(approvedIds),
            edits: editsPayload,
          }),
          timeoutMs: 60_000,
        }
      )
      toast.success(`${data.inserted} transacciones importadas correctamente.`)
      onConfirm()
    } catch (err) {
      const msg =
        err instanceof FetchJsonError ? err.message : 'No se pudo confirmar la importación.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetchJson(`/api/import/${importId}`, { method: 'DELETE', timeoutMs: 30_000 })
      onCancel()
    } catch {
      // Even on failure, close the review — staging is just an audit trail.
      onCancel()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header summary ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-bold text-text-primary">Revisa la importación</h3>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Importé{' '}
          <span className="font-semibold text-text-primary">
            {summary.transactions} transacciones
          </span>{' '}
          automáticamente.{' '}
          {summary.needsReview > 0 && (
            <>
              <span className="font-semibold text-amber-600">
                {summary.needsReview} fila{summary.needsReview === 1 ? '' : 's'}
              </span>{' '}
              {summary.needsReview === 1 ? 'requiere' : 'requieren'} tu revisión.{' '}
            </>
          )}
          {summary.skipped > 0 && (
            <>
              <span className="font-semibold">{summary.skipped}</span> bloque
              {summary.skipped === 1 ? '' : 's'} omitido{summary.skipped === 1 ? '' : 's'}{' '}
              (totales, comentarios, inventario).
            </>
          )}
        </p>
      </div>

      {/* ── Receivables / loans banner (próximamente) ──────────────────── */}
      {(summary.receivables > 0 || summary.loans > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Detectamos otros datos no transaccionales:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {summary.receivables > 0 && (
                <li>
                  {summary.receivables} deuda{summary.receivables === 1 ? '' : 's'} por cobrar
                </li>
              )}
              {summary.loans > 0 && (
                <li>
                  {summary.loans} préstamo{summary.loans === 1 ? '' : 's'}
                </li>
              )}
            </ul>
            <p className="mt-2 text-amber-700">
              Esta funcionalidad llegará pronto. Por ahora no se guardarán como transacciones.
            </p>
          </div>
        </div>
      )}

      {/* ── Per-table breakdown (collapsible) ──────────────────────────── */}
      {summary.blocks.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <button
            type="button"
            onClick={() => setBreakdownOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface-2 transition-colors rounded-xl"
          >
            {breakdownOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Layers className="w-4 h-4 text-text-muted" />
            Ver desglose por tabla ({summary.blocks.length})
          </button>
          {breakdownOpen && (
            <ul className="border-t border-border divide-y divide-border">
              {summary.blocks.map((b, i) => (
                <li
                  key={`${b.type}-${i}`}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-text-muted" />
                    <span className="font-medium text-text-primary">
                      {BLOCK_LABEL[b.type] ?? b.type}
                    </span>
                    {BLOCK_NOTE[b.type] && (
                      <span className="text-xs text-text-muted">— {BLOCK_NOTE[b.type]}</span>
                    )}
                  </span>
                  <span className="text-text-secondary tabular-nums">
                    {b.rowsExtracted > 0
                      ? `${b.rowsExtracted} extraída${b.rowsExtracted === 1 ? '' : 's'}`
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Recurring section (collapsible) ─────────────────────────────── */}
      {recurringRows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50">
          <button
            type="button"
            onClick={() => setRecurringOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-50 transition-colors rounded-xl"
          >
            {recurringOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Gastos recurrentes detectados ({recurringRows.length}) — sin fecha específica
          </button>
          {recurringOpen && (
            <div className="border-t border-amber-200 p-4 space-y-3">
              <p className="text-sm text-amber-800">
                Estos son gastos que se repiten cada mes (renta, sueldos, servicios). Indica
                desde qué fecha registrarlos.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRecurringDate(new Date().toISOString().slice(0, 10))}
                  className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Aplicar fecha de hoy a todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    setRecurringDate(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
                    )
                  }}
                  className="text-xs font-semibold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Aplicar primer día del mes a todos
                </button>
                <button
                  type="button"
                  onClick={() => setRecurringOpen(true)}
                  className="text-xs font-medium text-amber-900 underline-offset-2 hover:underline px-2 py-1.5"
                >
                  Revisar uno por uno ↓
                </button>
              </div>
              <ul className="text-xs text-amber-900/80 space-y-1 max-h-48 overflow-auto">
                {recurringRows.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-2 py-1 rounded bg-white/60"
                  >
                    <span className="truncate">
                      {String(r.raw_row['Concepto'] ?? r.description ?? formatRaw(r.raw_row))}
                    </span>
                    <span className="tabular-nums shrink-0">
                      {r.amount != null ? formatCurrency(r.amount, 'EUR') : '—'}
                      <span className="text-amber-700 ml-2">
                        {edits[r.id]?.date ?? r.date ?? 'sin fecha'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Other needsReview rows (editable table) ─────────────────────── */}
      {otherRows.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="text-sm font-semibold text-text-primary">
              Otras filas que requieren revisión ({otherRows.length})
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => approveAll(otherRows)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Aprobar todas
              </button>
              <span className="text-text-muted">·</span>
              <button
                type="button"
                onClick={() => discardAll(otherRows)}
                className="text-xs font-semibold text-text-muted hover:text-text-secondary"
              >
                Descartar todas
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-text-muted text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2 text-left">Categoría</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Razón</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {otherRows.map((r) => {
                  const e = edits[r.id] ?? {}
                  const approved = approvedIds.has(r.id)
                  const flag = flagLabel(r.review_flags?.reason, r.raw_row)
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'hover:bg-surface-2/50 transition-colors',
                        approved && 'bg-brand-50/40'
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={e.date ?? r.date ?? ''}
                          onChange={(ev) => patchRow(r.id, { date: ev.target.value })}
                          className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={e.description ?? r.description ?? formatRaw(r.raw_row)}
                          onChange={(ev) => patchRow(r.id, { description: ev.target.value })}
                          className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={e.amount ?? r.amount ?? ''}
                          onChange={(ev) =>
                            patchRow(r.id, {
                              amount: ev.target.value === '' ? null : Number(ev.target.value),
                            })
                          }
                          className="w-24 bg-transparent border border-border rounded px-2 py-1 text-xs text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={e.category ?? r.category ?? ''}
                          onChange={(ev) => patchRow(r.id, { category: ev.target.value })}
                          className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={e.type ?? r.type ?? 'expense'}
                          onChange={(ev) =>
                            patchRow(r.id, { type: ev.target.value as 'income' | 'expense' })
                          }
                          className="bg-transparent border border-border rounded px-2 py-1 text-xs"
                        >
                          <option value="expense">Gasto</option>
                          <option value="income">Ingreso</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          title={flag.tooltip}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-semibold"
                        >
                          {flag.badge}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            approved
                              ? discardAll([r])
                              : approveAll([r])
                          }
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-md transition-colors',
                            approved
                              ? 'bg-brand-600 text-white hover:bg-brand-700'
                              : 'bg-surface-2 text-text-secondary hover:bg-border'
                          )}
                        >
                          {approved ? 'Aprobada' : 'Aprobar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-app/80 backdrop-blur-sm border-t border-border flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary px-4 py-2.5 rounded-xl border border-border hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Cancelar importación
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Confirmar importación
        </button>
      </div>
    </div>
  )
}
