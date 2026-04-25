import type { ParsedRow } from './parse-file'

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
  suggestedPatch?: Partial<NormalizedTransaction & { amount: number | null }>
}

export interface NormalizeResult {
  transactions: NormalizedTransaction[]
  needsReview: NeedsReviewRow[]
}

// ── Amount parsing ────────────────────────────────────────────────────────────

/**
 * Parse a currency-ish string into a number. Returns `null` when the input
 * cannot be interpreted as a number — callers must treat `null` as
 * "needs review", NOT as zero. This is the fix for the silent drop bug
 * where unparseable amounts were being coerced to 0 and then skipped by
 * `if (amount === 0) continue`.
 */
export function parseAmount(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (trimmed === '' || trimmed === '-') return null

  let str = trimmed
    .replace(/[€$£¥₹\s]/g, '')
    .replace(/^"|"$/g, '')

  const isAccountingNegative = str.startsWith('(') && str.endsWith(')')
  str = str.replace(/[()]/g, '')

  if (str === '') return null

  const lastComma = str.lastIndexOf(',')
  const lastPeriod = str.lastIndexOf('.')

  if (lastComma > lastPeriod) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    str = str.replace(/,/g, '')
  }

  const amount = parseFloat(str)
  if (!Number.isFinite(amount)) return null
  return isAccountingNegative ? -Math.abs(amount) : amount
}

// ── Date parsing ──────────────────────────────────────────────────────────────

const SPANISH_MONTHS: Record<string, string> = {
  enero: '01', ene: '01',
  febrero: '02', feb: '02',
  marzo: '03', mar: '03',
  abril: '04', abr: '04',
  mayo: '05', may: '05',
  junio: '06', jun: '06',
  julio: '07', jul: '07',
  agosto: '08', ago: '08',
  septiembre: '09', sep: '09', sept: '09',
  octubre: '10', oct: '10',
  noviembre: '11', nov: '11',
  diciembre: '12', dic: '12',
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Parse a date string to ISO YYYY-MM-DD. Returns `null` when the format is
 * not recognised — callers must treat null as "needs review", NOT as "today".
 * This is the fix for the silent contamination bug where unparseable dates
 * defaulted to `todayIso()` and polluted the dashboard.
 */
export function parseDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (raw === '') return null
  const str = raw.toLowerCase()

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10)

  const dmyNum = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (dmyNum) {
    const [, d, m, y] = dmyNum
    const year = y.length === 2 ? `20${y}` : y
    const dd = d.padStart(2, '0')
    const mm = m.padStart(2, '0')
    // Sanity — reject obviously-bad month/day combos instead of generating
    // "2024-13-45" which would then bomb further downstream.
    if (Number(mm) < 1 || Number(mm) > 12) return null
    if (Number(dd) < 1 || Number(dd) > 31) return null
    return `${year}-${mm}-${dd}`
  }

  const spanishFull = str.match(/^(\d{1,2})?[\s\-\/]?([a-záéíóúñ]{3,})[\s\-\/](\d{2,4})$/i)
  if (spanishFull) {
    const [, d, m, y] = spanishFull
    const monthKey = Object.keys(SPANISH_MONTHS).find((k) => m.toLowerCase().startsWith(k))
    if (monthKey) {
      const month = SPANISH_MONTHS[monthKey]
      const year = y.length === 2 ? `20${y}` : y
      const day = d ? d.padStart(2, '0') : '01'
      return `${year}-${month}-${day}`
    }
  }

  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]

  return null
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
 * Apply Claude's column mapping to every parsed row. Returns:
 *   - `transactions`: rows that parsed cleanly (including amount === 0,
 *                     which is a legal value — refunds, reconciliations).
 *   - `needsReview`:  rows whose amount or date couldn't be parsed. They
 *                     are NOT silently dropped and NOT assigned today's
 *                     date. The UI surfaces them so the user fixes them.
 */
export function normalizeTransactions(
  rows: ParsedRow[],
  mapping: ColumnMapping
): NormalizeResult {
  const transactions: NormalizedTransaction[] = []
  const needsReview: NeedsReviewRow[] = []

  for (const row of rows) {
    const values = Object.values(row).filter((v) => v.trim() !== '')
    if (values.length === 0) continue

    // ── Amount ────────────────────────────────────────────────────────────
    let amount: number | null
    let signedForTypeDetection: number | null = null

    if (mapping.tipo_metodo === 'debito_credito') {
      const credit = mapping.monto_credito ? parseAmount(row[mapping.monto_credito] ?? '') : null
      const debit = mapping.monto_debito ? parseAmount(row[mapping.monto_debito] ?? '') : null
      const bothNull = credit === null && debit === null
      if (bothNull) {
        needsReview.push({
          rawRow: row,
          reason: 'amount_unparseable',
          suggestedPatch: { amount: null },
        })
        continue
      }
      amount = Math.abs((credit ?? 0) > 0 ? (credit ?? 0) : (debit ?? 0))
    } else {
      const signed = mapping.monto ? parseAmount(row[mapping.monto] ?? '') : null
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
      const parsed = parseDate(row[mapping.fecha] ?? '')
      if (parsed === null) {
        needsReview.push({
          rawRow: row,
          reason: 'date_unparseable',
          suggestedPatch: { amount, type: detectedType },
        })
        continue
      }
      date = parsed
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
