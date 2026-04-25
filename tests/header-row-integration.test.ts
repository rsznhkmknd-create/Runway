import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseUploadedFile,
  reindexSheetWithHeaderRow,
} from '@/lib/parse-file'
import { normalizeTransactions, type ColumnMapping } from '@/lib/normalize-transactions'

/**
 * Integration test for the Santander-shaped messy file:
 *   Row 1: "Banco Santander"           (single-cell title — must NOT be header)
 *   Row 2: "Extracto cuenta 0049-..."  (single-cell metadata)
 *   Row 3: ""                          (empty)
 *   Row 4: "Fecha | Descripción | Importe"
 *   Rows 5-8: 4 transactions
 *
 * Goal: after passing mapping.header_row=4, the 4 transactions must be
 * detected with their correct amounts, dates, and descriptions — not
 * undefined and not assigned to today.
 */

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

describe('messy-file integration (Santander-shape)', () => {
  it('parses the workbook without throwing and keeps the raw matrix intact', () => {
    const buf = buildSantanderXlsx()
    const parsed = parseUploadedFile(buf, 'santander.xlsx')
    expect(parsed.sheets.length).toBe(1)
    const sheet = parsed.sheets[0]
    expect(sheet.rawMatrix.length).toBeGreaterThanOrEqual(8)
    // Heuristic should NOT think row 1 is a header (single-cell title).
    expect(sheet.headerRowDetected).toBe(false)
  })

  it('re-indexing with header_row=4 yields 4 valid transactions, no needsReview', () => {
    const buf = buildSantanderXlsx()
    const parsed = parseUploadedFile(buf, 'santander.xlsx')
    const sheet = parsed.sheets[0]

    const reindexed = reindexSheetWithHeaderRow(sheet, 4)
    expect(reindexed.columns).toEqual(['Fecha', 'Descripción', 'Importe'])
    expect(reindexed.rows.length).toBe(4)
    expect(reindexed.rows[0]['Fecha']).toBe('2024-01-02')
    expect(reindexed.rows[0]['Importe']).toBe('2500')

    const mapping: ColumnMapping = {
      fecha: 'Fecha',
      concepto: 'Descripción',
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
      header_row: 4,
    }

    const { transactions, needsReview } = normalizeTransactions(reindexed.rows, mapping)
    expect(needsReview).toEqual([])
    expect(transactions.length).toBe(4)
    expect(transactions[0]).toMatchObject({
      amount: 2500,
      type: 'income',
      description: 'Nómina Acme SL',
      date: '2024-01-02',
    })
    expect(transactions[1]).toMatchObject({
      amount: 800,
      type: 'expense',
      description: 'Alquiler oficina',
      date: '2024-01-03',
    })
    expect(transactions[2]).toMatchObject({ amount: 45.5, type: 'expense' })
    expect(transactions[3]).toMatchObject({ amount: 1200, type: 'income' })
  })

  it('without re-indexing, the file would have produced 0 transactions (regression guard)', () => {
    const buf = buildSantanderXlsx()
    const parsed = parseUploadedFile(buf, 'santander.xlsx')
    const sheet = parsed.sheets[0]
    // Pretend Claude said monto column is "Importe" but we never re-indexed.
    // Rows are keyed by numeric indices "0","1","2" — so row["Importe"] is undefined.
    const mapping: ColumnMapping = {
      fecha: 'Fecha',
      concepto: 'Descripción',
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
    const { transactions, needsReview } = normalizeTransactions(sheet.rows, mapping)
    expect(transactions.length).toBe(0)
    // Now the rows ARE surfaced for review — not silently dropped.
    expect(needsReview.length).toBeGreaterThan(0)
    expect(needsReview.every((r) => r.reason === 'amount_unparseable')).toBe(true)
  })
})
