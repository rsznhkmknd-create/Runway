import type { ParsedRow } from './parse-file'
import type { NeedsReviewPatch } from './schemas/import'
import { parseAmount as parseAmountV2 } from './parsers/amount'
import { parseDate as parseDateV2 } from './parsers/date'

export type ConfidenceLevel = 'alto' | 'medio' | 'bajo'

export interface PerColumnConfidence {
  fecha?: ConfidenceLevel | null
  concepto?: ConfidenceLevel | null
  monto?: ConfidenceLevel | null
  tipo?: ConfidenceLevel | null
  categoria?: ConfidenceLevel | null
}

export interface ColumnMapping {
  fecha: string | null
  concepto: string | null
  monto: string | null
  monto_debito: string | null
  monto_credito: string | null
  tipo: string | null
  tipo_metodo:
    | 'columna_explicita'
    | 'signo_positivo_es_ingreso'
    | 'signo_positivo_es_gasto'
    | 'debito_credito'
    | 'descripcion_keywords'
  tipo_valores_ingreso: string[]
  tipo_valores_gasto: string[]
  categoria: string | null
  confidence: ConfidenceLevel
  moneda_detectada: string
  notas: string
  /** Optional: which sheet to use (multi-sheet workbooks). Defaults to the first. */
  sheet?: string | null
  /** Optional: 1-indexed header row. Defaults to 1. */
  header_row?: number | null
  /** Optional: per-column confidence for the preview UI */
  per_column_confidence?: PerColumnConfidence
  /** Optional: Claude's chain-of-thought about the file structure */
  reasoning?: string
}

export interface NormalizedTransaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
}

export type NeedsReviewReason =
  | 'amount_unparseable'
  | 'date_unparseable'
  | 'missing_description'
  | 'missing_type_signal'

export interface NeedsReviewRow {
  rawRow: ParsedRow
  reason: NeedsReviewReason
  suggestedPatch?: NeedsReviewPatch
}

export interface NormalizeResult {
  transactions: NormalizedTransaction[]
  needsReview: NeedsReviewRow[]
}

// ── Amount + Date parsing ────────────────────────────────────────────────────
//
// The hand-rolled implementations of parseAmount/parseDate that used to live
// here were moved to lib/parsers/{amount,date}.ts in Prompt 3 of the import
// hardening work. They now handle LATAM-specific cases:
//   - parseAmount: ~/aprox/como/etc., currency codes (MXN/CLP/...), accounting
//     parens, multi-number cells, Excel formula errors, ambiguous separators.
//   - parseDate:   Excel serials, chrono-node natural language (es + en),
//     month-only inputs ("abril"), suspicious_year / future_year flagging.
//
// The wrappers below preserve the old narrow signatures for any caller that
// still imports them (smoke tests, downstream code). They DELEGATE to the new
// parsers but discard the rich `{ confidence, flags }` payload. New code
// should import from '@/lib/parsers/amount' and '@/lib/parsers/date' directly.
//
// DO NOT delete the wrappers without updating every caller — they're the
// safety net for a quick rollback if the new parsers misbehave in prod.

/** @deprecated Use `parseAmount` from `@/lib/parsers/amount` for full output. */
export function parseAmount(value: string | null | undefined): number | null {
  return parseAmountV2(value).amount
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

/** @deprecated Use `parseDate` from `@/lib/parsers/date` for full output. */
export function parseDate(value: string | null | undefined): string | null {
  return parseDateV2(value).date
}

// ── Description-based type inference (fallback) ────────────────────────────────
const INCOME_KEYWORDS = [
  'salario', 'nómina', 'nomina', 'sueldo', 'cobro', 'abono', 'ingreso',
  'transferencia recibida', 'devolución', 'devolucion', 'reembolso',
  'factura emitida', 'pago cliente', 'venta', 'dividendo',
]
const EXPENSE_KEYWORDS = [
  'pago', 'gasto', 'compra', 'cargo', 'débito', 'debito',
  'transferencia enviada', 'retiro', 'comisión', 'comision', 'recibo',
  'alquiler', 'suministro', 'factura recibida', 'impuesto',
]

function inferTypeFromDescription(desc: string): 'income' | 'expense' | null {
  const d = desc.toLowerCase()
  for (const k of INCOME_KEYWORDS) if (d.includes(k)) return 'income'
  for (const k of EXPENSE_KEYWORDS) if (d.includes(k)) return 'expense'
  return null
}

// ── Type detection ────────────────────────────────────────────────────────────
function detectType(
  row: ParsedRow,
  mapping: ColumnMapping,
  /** signed amount from the main 'monto' column, if any — pre-parsed for speed */
  signedAmount: number | null
): 'income' | 'expense' | null {
  if (mapping.tipo_metodo === 'debito_credito') {
    const credit = mapping.monto_credito ? parseAmount(row[mapping.monto_credito] ?? '') : null
    return (credit ?? 0) > 0 ? 'income' : 'expense'
  }

  if (mapping.tipo_metodo === 'columna_explicita' && mapping.tipo) {
    const val = (row[mapping.tipo] ?? '').toLowerCase().trim()
    const ingresoVals = mapping.tipo_valores_ingreso.map((v) => v.toLowerCase())
    const gastoVals = mapping.tipo_valores_gasto.map((v) => v.toLowerCase())
    if (ingresoVals.some((v) => val.includes(v) || v.includes(val))) return 'income'
    if (gastoVals.some((v) => val.includes(v) || v.includes(val))) return 'expense'
  }

  if (mapping.tipo_metodo === 'descripcion_keywords' && mapping.concepto) {
    const inferred = inferTypeFromDescription(row[mapping.concepto] ?? '')
    if (inferred) return inferred
  }

  if (signedAmount !== null) {
    if (mapping.tipo_metodo === 'signo_positivo_es_gasto') {
      return signedAmount > 0 ? 'expense' : 'income'
    }
    if (mapping.tipo_metodo === 'signo_positivo_es_ingreso') {
      return signedAmount > 0 ? 'income' : 'expense'
    }
  }

  // Last-ditch: description keywords even if method isn't set that way
  if (mapping.concepto) {
    const inferred = inferTypeFromDescription(row[mapping.concepto] ?? '')
    if (inferred) return inferred
  }

  // No signal at all. Caller decides what to do.
  return null
}

// ── Main normalizer ────────────────────────────────────────────────────────────

/**
 * One-pass scan extracting every 4-digit year from the rows. Used to compute
 * a yearRange that gets passed to parseDate for suspicious_year detection.
 * Cheap regex-only — does NOT call parseDate (would be O(n) chrono parses).
 */
function detectYearRange(rows: ParsedRow[]): [number, number] | undefined {
  const years = new Set<number>()
  const yearRegex = /\b(?:19|20|21)\d{2}\b/g
  for (const row of rows) {
    for (const value of Object.values(row)) {
      const matches = String(value).match(yearRegex)
      if (!matches) continue
      for (const m of matches) {
        const year = Number(m)
        if (year >= 1990 && year <= 2099) years.add(year)
      }
    }
  }
  if (years.size === 0) return undefined
  const arr = Array.from(years).sort((a, b) => a - b)
  return [arr[0], arr[arr.length - 1]]
}

export type NormalizeContext = {
  /** Decimal separator detected at the file level — passed through to parseAmount. */
  decimalSeparator?: ',' | '.' | 'unknown'
}

/**
 * Apply Claude's column mapping to every parsed row. Returns:
 *   - `transactions`: rows that parsed cleanly (including amount === 0,
 *                     which is a legal value — refunds, reconciliations).
 *   - `needsReview`:  rows whose amount or date couldn't be parsed. They
 *                     are NOT silently dropped and NOT assigned today's
 *                     date. The UI surfaces them so the user fixes them.
 *
 * The optional `ctx.decimalSeparator` should come from the parsed sheet's
 * `locale.decimalSeparator` so the amount parser can disambiguate
 * single-separator strings ("1,234" → could be 1.234 or 1234 thousand).
 */
export function normalizeTransactions(
  rows: ParsedRow[],
  mapping: ColumnMapping,
  ctx: NormalizeContext = {}
): NormalizeResult {
  const transactions: NormalizedTransaction[] = []
  const needsReview: NeedsReviewRow[] = []

  // File-level locale for amount parsing.
  const decSep =
    ctx.decimalSeparator === ',' || ctx.decimalSeparator === '.'
      ? ctx.decimalSeparator
      : undefined
  const amountCtx = decSep ? { decimalSeparator: decSep } : {}

  // File-level year range for date parsing (suspicious_year flagging).
  const yearRange = detectYearRange(rows)
  const fileYear = yearRange ? yearRange[1] : undefined
  const dateCtx = { fileYear, yearRange }

  for (const row of rows) {
    const values = Object.values(row).filter((v) => v.trim() !== '')
    if (values.length === 0) continue

    // ── Amount ────────────────────────────────────────────────────────────
    let amount: number | null
    let signedForTypeDetection: number | null = null

    if (mapping.tipo_metodo === 'debito_credito') {
      const creditP = mapping.monto_credito
        ? parseAmountV2(row[mapping.monto_credito] ?? '', amountCtx)
        : null
      const debitP = mapping.monto_debito
        ? parseAmountV2(row[mapping.monto_debito] ?? '', amountCtx)
        : null
      const credit = creditP?.amount ?? null
      const debit = debitP?.amount ?? null

      if (credit === null && debit === null) {
        needsReview.push({
          rawRow: row,
          reason: 'amount_unparseable',
          suggestedPatch: { amount: null },
        })
        continue
      }
      amount = Math.abs((credit ?? 0) > 0 ? (credit ?? 0) : (debit ?? 0))
    } else {
      const parsedAmt = mapping.monto
        ? parseAmountV2(row[mapping.monto] ?? '', amountCtx)
        : null
      const signed = parsedAmt?.amount ?? null
      signedForTypeDetection = signed
      if (signed === null) {
        needsReview.push({
          rawRow: row,
          reason: 'amount_unparseable',
          suggestedPatch: { amount: null },
        })
        continue
      }
      amount = Math.abs(signed)
    }

    if (!Number.isFinite(amount)) {
      needsReview.push({
        rawRow: row,
        reason: 'amount_unparseable',
        suggestedPatch: { amount: null },
      })
      continue
    }
    // NOTE: amount === 0 is intentionally allowed through — it's valid for
    // refunds, zero-sum reconciliations, or opening balances.

    // ── Type ──────────────────────────────────────────────────────────────
    const detectedType = detectType(row, mapping, signedForTypeDetection)
    if (detectedType === null) {
      needsReview.push({ rawRow: row, reason: 'missing_type_signal' })
      continue
    }

    // ── Date ──────────────────────────────────────────────────────────────
    let date: string
    if (mapping.fecha) {
      const parsedDate = parseDateV2(row[mapping.fecha] ?? '', dateCtx)
      if (parsedDate.date === null) {
        needsReview.push({
          rawRow: row,
          reason: 'date_unparseable',
          suggestedPatch: { amount, type: detectedType },
        })
        continue
      }
      date = parsedDate.date
    } else {
      // No date column mapped at all — use import date. This is explicit and
      // called out in warnings upstream; not a silent fallback per row.
      date = todayIso()
    }

    // ── Description + category ────────────────────────────────────────────
    const description = mapping.concepto
      ? (row[mapping.concepto] ?? '').trim() || 'Sin descripción'
      : 'Sin descripción'

    const category = mapping.categoria
      ? (row[mapping.categoria] ?? '').trim() || 'Sin categoría'
      : 'Sin categoría'

    transactions.push({ amount, type: detectedType, category, description, date })
  }

  return { transactions, needsReview }
}
