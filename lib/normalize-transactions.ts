import type { ParsedRow } from './parse-file'

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
  confidence: 'alto' | 'medio' | 'bajo'
  moneda_detectada: string
  notas: string
}

export interface NormalizedTransaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
}

// ── Amount parsing ────────────────────────────────────────────────────────────
export function parseAmount(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0

  let str = value
    .trim()
    .replace(/[€$£¥₹\s]/g, '')
    .replace(/^"|"$/g, '')

  const isAccountingNegative = str.startsWith('(') && str.endsWith(')')
  str = str.replace(/[()]/g, '')

  const lastComma = str.lastIndexOf(',')
  const lastPeriod = str.lastIndexOf('.')

  if (lastComma > lastPeriod) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    str = str.replace(/,/g, '')
  }

  const amount = parseFloat(str)
  if (isNaN(amount)) return 0
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

export function parseDate(value: string): string {
  if (!value || value.trim() === '') return todayIso()
  const str = value.trim().toLowerCase()

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10)

  const dmyNum = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (dmyNum) {
    const [, d, m, y] = dmyNum
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
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

  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]

  return todayIso()
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
function detectType(row: ParsedRow, mapping: ColumnMapping): 'income' | 'expense' {
  if (mapping.tipo_metodo === 'debito_credito') {
    const credit = mapping.monto_credito ? parseAmount(row[mapping.monto_credito] ?? '') : 0
    return credit > 0 ? 'income' : 'expense'
  }

  if (mapping.tipo_metodo === 'columna_explicita' && mapping.tipo) {
    const val = (row[mapping.tipo] ?? '').toLowerCase().trim()
    const ingresoVals = mapping.tipo_valores_ingreso.map((v) => v.toLowerCase())
    const gastoVals = mapping.tipo_valores_gasto.map((v) => v.toLowerCase())
    if (ingresoVals.some((v) => val.includes(v) || v.includes(val))) return 'income'
    if (gastoVals.some((v) => val.includes(v) || v.includes(val))) return 'expense'
  }

  // Keyword fallback from description
  if (mapping.tipo_metodo === 'descripcion_keywords' && mapping.concepto) {
    const inferred = inferTypeFromDescription(row[mapping.concepto] ?? '')
    if (inferred) return inferred
  }

  // Sign-based fallback
  const amount = parseAmount(row[mapping.monto ?? ''] ?? '0')
  if (mapping.tipo_metodo === 'signo_positivo_es_gasto') {
    return amount > 0 ? 'expense' : 'income'
  }

  // Last resort: description keywords even if method isn't set that way
  if (mapping.concepto) {
    const inferred = inferTypeFromDescription(row[mapping.concepto] ?? '')
    if (inferred) return inferred
  }

  return amount >= 0 ? 'income' : 'expense'
}

// ── Main normalizer ────────────────────────────────────────────────────────────
export function normalizeTransactions(
  rows: ParsedRow[],
  mapping: ColumnMapping
): NormalizedTransaction[] {
  const results: NormalizedTransaction[] = []

  for (const row of rows) {
    const values = Object.values(row).filter((v) => v.trim() !== '')
    if (values.length === 0) continue

    const type = detectType(row, mapping)

    let amount: number
    if (mapping.tipo_metodo === 'debito_credito') {
      const credit = mapping.monto_credito ? parseAmount(row[mapping.monto_credito] ?? '') : 0
      const debit = mapping.monto_debito ? parseAmount(row[mapping.monto_debito] ?? '') : 0
      amount = Math.abs(type === 'income' ? credit : debit)
    } else {
      amount = Math.abs(parseAmount(row[mapping.monto ?? ''] ?? '0'))
    }

    if (amount === 0) continue

    const description = mapping.concepto
      ? (row[mapping.concepto] ?? '').trim() || 'Sin descripción'
      : 'Sin descripción'

    // Date: if no column mapped or value empty, use today (import date)
    const dateRaw = mapping.fecha ? (row[mapping.fecha] ?? '').trim() : ''
    const date = parseDate(dateRaw)

    const category = mapping.categoria
      ? (row[mapping.categoria] ?? '').trim() || 'Sin categoría'
      : 'Sin categoría'

    results.push({ amount, type, category, description, date })
  }

  return results
}
