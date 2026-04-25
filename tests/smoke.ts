/**
 * Standalone smoke runner — exercises the three regression-prone paths
 * we just fixed, without going through Vitest (which hangs silently
 * under Node 25 due to a Vite/worker incompatibility in this env).
 *
 * Run with:  node --experimental-strip-types tests/smoke.ts
 *
 * Exits non-zero on any failure so it's CI-friendly.
 */
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { ColumnMappingSchema, NormalizedTransactionSchema, ImportBodySchema } from '../lib/schemas/import.ts'
import {
  normalizeTransactions,
  parseAmount,
  parseDate,
  type ColumnMapping,
} from '../lib/normalize-transactions.ts'
import { parseUploadedFile, reindexSheetWithHeaderRow } from '../lib/parse-file.ts'

let passed = 0
let failed = 0
const failures: string[] = []

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    failures.push(`${name}\n    ${msg}`)
    console.log(`  ✗ ${name}\n    ${msg}`)
  }
}

function group(title: string) {
  console.log(`\n${title}`)
}

const baseMapping: ColumnMapping = {
  fecha: 'Fecha',
  concepto: 'Concepto',
  monto: 'Importe',
  monto_debito: null,
  monto_credito: null,
  tipo: null,
  tipo_metodo: 'signo_positivo_es_ingreso',
  tipo_valores_ingreso: [],
  tipo_valores_gasto: [],
  categoria: null,
  confidence: 'alto',
  moneda_detectada: 'EUR',
  notas: '',
}

// ── ColumnMappingSchema ──────────────────────────────────────────────────────
group('ColumnMappingSchema')

test('accepts a valid mapping', () => {
  assert.equal(ColumnMappingSchema.safeParse(baseMapping).success, true)
})

test('rejects mapping without monto NOR debe/haber pair (path=monto)', () => {
  const r = ColumnMappingSchema.safeParse({ ...baseMapping, monto: null })
  assert.equal(r.success, false)
  if (!r.success) assert.equal(r.error.issues[0].path.join('.'), 'monto')
})

test('accepts debe/haber pair when monto is null', () => {
  const r = ColumnMappingSchema.safeParse({
    ...baseMapping,
    monto: null,
    monto_debito: 'Debe',
    monto_credito: 'Haber',
    tipo_metodo: 'debito_credito',
  })
  assert.equal(r.success, true)
})

test('rejects tipo_metodo "magic_unicorn"', () => {
  assert.equal(
    ColumnMappingSchema.safeParse({ ...baseMapping, tipo_metodo: 'magic_unicorn' }).success,
    false
  )
})

test('coerces string "null" to actual null', () => {
  const r = ColumnMappingSchema.safeParse({ ...baseMapping, fecha: 'null' })
  assert.equal(r.success, true)
  if (r.success) assert.equal(r.data.fecha, null)
})

test('rejects negative header_row', () => {
  assert.equal(
    ColumnMappingSchema.safeParse({ ...baseMapping, header_row: -1 }).success,
    false
  )
})

// ── NormalizedTransactionSchema ──────────────────────────────────────────────
group('NormalizedTransactionSchema')

test('accepts a valid transaction', () => {
  const r = NormalizedTransactionSchema.safeParse({
    amount: 123.45, type: 'expense', category: 'X', description: 'm', date: '2024-01-15',
  })
  assert.equal(r.success, true)
})

test('rejects bad date format', () => {
  const r = NormalizedTransactionSchema.safeParse({
    amount: 1, type: 'expense', category: 'X', description: '', date: '15/01/2024',
  })
  assert.equal(r.success, false)
})

test('rejects non-finite amount', () => {
  const r = NormalizedTransactionSchema.safeParse({
    amount: Number.POSITIVE_INFINITY, type: 'income', category: 'X', description: '', date: '2024-01-15',
  })
  assert.equal(r.success, false)
})

// ── ImportBodySchema ─────────────────────────────────────────────────────────
group('ImportBodySchema')

test('accepts transactions only', () => {
  const r = ImportBodySchema.safeParse({
    transactions: [{ amount: 1, type: 'income', category: 'X', description: '', date: '2024-01-01' }],
  })
  assert.equal(r.success, true)
})

test('accepts needsReviewApproved alongside transactions', () => {
  const r = ImportBodySchema.safeParse({
    transactions: [],
    needsReviewApproved: [
      { amount: 99, type: 'expense', category: 'Y', description: 'fixed', date: '2024-02-01' },
    ],
  })
  assert.equal(r.success, true)
})

test('rejects missing transactions', () => {
  assert.equal(ImportBodySchema.safeParse({}).success, false)
})

// ── parseAmount ──────────────────────────────────────────────────────────────
group('parseAmount')

test('returns null (NOT 0) for empty/invalid input', () => {
  assert.equal(parseAmount(''), null)
  assert.equal(parseAmount('   '), null)
  assert.equal(parseAmount('abc'), null)
  assert.equal(parseAmount(null), null)
  assert.equal(parseAmount(undefined), null)
  assert.equal(parseAmount('-'), null)
})

test('handles Spanish format "1.234,56"', () => {
  assert.equal(parseAmount('1.234,56'), 1234.56)
})

test('handles English format "1,234.56"', () => {
  assert.equal(parseAmount('1,234.56'), 1234.56)
})

test('handles accounting parens negative "(800,00)"', () => {
  assert.equal(parseAmount('(800,00)'), -800)
})

test('returns 0 for "0" — distinct from null', () => {
  assert.equal(parseAmount('0'), 0)
  assert.equal(parseAmount('0,00'), 0)
})

// ── parseDate ────────────────────────────────────────────────────────────────
group('parseDate')

test('returns null (NOT today) for unrecognised input', () => {
  assert.equal(parseDate(''), null)
  assert.equal(parseDate('not a date'), null)
  assert.equal(parseDate(null), null)
})

test('parses ISO YYYY-MM-DD', () => {
  assert.equal(parseDate('2024-03-15'), '2024-03-15')
})

test('parses DD/MM/YYYY', () => {
  assert.equal(parseDate('15/03/2024'), '2024-03-15')
})

test('parses Spanish month names', () => {
  assert.equal(parseDate('15 enero 2024'), '2024-01-15')
  assert.equal(parseDate('1 ago 24'), '2024-08-01')
})

test('rejects "32/13/2024"', () => {
  assert.equal(parseDate('32/13/2024'), null)
})

// ── normalizeTransactions ────────────────────────────────────────────────────
group('normalizeTransactions')

test('ALLOWS amount === 0 (regression: was being silently dropped)', () => {
  const rows = [{ Fecha: '2024-01-01', Concepto: 'Reembolso', Importe: '0' }]
  const { transactions, needsReview } = normalizeTransactions(rows, baseMapping)
  assert.equal(transactions.length, 1)
  assert.equal(transactions[0].amount, 0)
  assert.equal(needsReview.length, 0)
})

test('amount unparseable → needsReview (NOT silently dropped)', () => {
  const rows = [{ Fecha: '2024-01-01', Concepto: 'X', Importe: 'no-numero' }]
  const { transactions, needsReview } = normalizeTransactions(rows, baseMapping)
  assert.equal(transactions.length, 0)
  assert.equal(needsReview.length, 1)
  assert.equal(needsReview[0].reason, 'amount_unparseable')
})

test('date unparseable → needsReview (NOT assigned to today)', () => {
  const rows = [{ Fecha: 'fecha-rota', Concepto: 'X', Importe: '100' }]
  const { transactions, needsReview } = normalizeTransactions(rows, baseMapping)
  assert.equal(transactions.length, 0)
  assert.equal(needsReview.length, 1)
  assert.equal(needsReview[0].reason, 'date_unparseable')
})

test('todayIso ONLY when fecha column is not mapped', () => {
  const mapping: ColumnMapping = { ...baseMapping, fecha: null }
  const rows = [{ Concepto: 'X', Importe: '100' }]
  const { transactions } = normalizeTransactions(rows, mapping)
  assert.equal(transactions.length, 1)
  assert.match(transactions[0].date, /^\d{4}-\d{2}-\d{2}$/)
})

test('debe/haber method correctly assigns income/expense + amounts', () => {
  const dh: ColumnMapping = {
    ...baseMapping, monto: null, monto_debito: 'Debe', monto_credito: 'Haber', tipo_metodo: 'debito_credito',
  }
  const rows = [
    { Fecha: '2024-01-02', Concepto: 'Nómina',  Debe: '',       Haber: '2500,00' },
    { Fecha: '2024-01-03', Concepto: 'Alquiler', Debe: '800,00', Haber: '' },
  ]
  const { transactions, needsReview } = normalizeTransactions(rows, dh)
  assert.equal(needsReview.length, 0)
  assert.equal(transactions.length, 2)
  assert.equal(transactions[0].type, 'income')
  assert.equal(transactions[0].amount, 2500)
  assert.equal(transactions[1].type, 'expense')
  assert.equal(transactions[1].amount, 800)
})

// ── Integration: Santander-shape header_row=4 ───────────────────────────────
group('integration: Santander-shape (header_row=4)')

function buildSantanderXlsx(): Buffer {
  const aoa: (string | number)[][] = [
    ['Banco Santander'],
    ['Extracto cuenta 0049-XXXX-YY-1234567890'],
    [''],
    ['Fecha', 'Descripción', 'Importe'],
    ['2024-01-02', 'Nómina Acme SL', 2500],
    ['2024-01-03', 'Alquiler oficina', -800],
    ['2024-01-05', 'Compra Mercadona', -45.5],
    ['2024-01-10', 'Cobro factura cliente', 1200],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

test('parses without throwing; heuristic does NOT flag row 1 as header', () => {
  const buf = buildSantanderXlsx()
  const parsed = parseUploadedFile(buf, 'santander.xlsx')
  assert.equal(parsed.sheets.length, 1)
  const sheet = parsed.sheets[0]
  assert.ok(sheet.rawMatrix.length >= 8)
  assert.equal(sheet.headerRowDetected, false)
})

test('reindexSheetWithHeaderRow(sheet, 4) → 4 valid transactions, 0 needsReview', () => {
  const buf = buildSantanderXlsx()
  const parsed = parseUploadedFile(buf, 'santander.xlsx')
  const sheet = parsed.sheets[0]
  const reindexed = reindexSheetWithHeaderRow(sheet, 4)
  assert.deepEqual(reindexed.columns, ['Fecha', 'Descripción', 'Importe'])
  assert.equal(reindexed.rows.length, 4)

  const mapping: ColumnMapping = {
    ...baseMapping,
    fecha: 'Fecha', concepto: 'Descripción', monto: 'Importe',
    tipo_metodo: 'signo_positivo_es_ingreso', header_row: 4,
  }
  const { transactions, needsReview } = normalizeTransactions(reindexed.rows, mapping)
  assert.equal(needsReview.length, 0)
  assert.equal(transactions.length, 4)
  assert.equal(transactions[0].amount, 2500)
  assert.equal(transactions[0].type, 'income')
  assert.equal(transactions[0].date, '2024-01-02')
  assert.equal(transactions[0].description, 'Nómina Acme SL')
  assert.equal(transactions[1].amount, 800)
  assert.equal(transactions[1].type, 'expense')
  assert.equal(transactions[2].amount, 45.5)
  assert.equal(transactions[3].amount, 1200)
})

test('regression guard: WITHOUT re-index, 0 rows extracted but they go to needsReview', () => {
  const buf = buildSantanderXlsx()
  const parsed = parseUploadedFile(buf, 'santander.xlsx')
  const sheet = parsed.sheets[0]
  const mapping: ColumnMapping = {
    ...baseMapping,
    fecha: 'Fecha', concepto: 'Descripción', monto: 'Importe',
    tipo_metodo: 'signo_positivo_es_ingreso',
  }
  const { transactions, needsReview } = normalizeTransactions(sheet.rows, mapping)
  assert.equal(transactions.length, 0)
  assert.ok(needsReview.length > 0)
  assert.ok(needsReview.every((r) => r.reason === 'amount_unparseable'))
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`)
console.log(`Tests:  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log(`\nFailures:`)
  for (const f of failures) console.log(`  • ${f}`)
  process.exit(1)
}
console.log('All assertions passed.')
process.exit(0)
