import { describe, it, expect } from 'vitest'
import {
  normalizeTransactions,
  parseAmount,
  parseDate,
  type ColumnMapping,
} from '@/lib/normalize-transactions'

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

// ── parseAmount ──────────────────────────────────────────────────────────────

describe('parseAmount', () => {
  it('returns null for empty/invalid input (instead of 0)', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount(null)).toBeNull()
    expect(parseAmount(undefined)).toBeNull()
    expect(parseAmount('-')).toBeNull()
  })

  it('handles Spanish format (1.234,56)', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
  })

  it('handles English format (1,234.56)', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56)
  })

  it('handles accounting parentheses negative', () => {
    expect(parseAmount('(800,00)')).toBe(-800)
  })

  it('strips currency symbols', () => {
    expect(parseAmount('€1.500,00')).toBe(1500)
  })

  it('returns 0 for "0" — distinct from null', () => {
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('0,00')).toBe(0)
  })
})

// ── parseDate ────────────────────────────────────────────────────────────────

describe('parseDate', () => {
  it('returns null for unrecognised formats (instead of today)', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate('not a date')).toBeNull()
    expect(parseDate(null)).toBeNull()
  })

  it('parses ISO YYYY-MM-DD', () => {
    expect(parseDate('2024-03-15')).toBe('2024-03-15')
  })

  it('parses DD/MM/YYYY', () => {
    expect(parseDate('15/03/2024')).toBe('2024-03-15')
  })

  it('parses Spanish month names', () => {
    expect(parseDate('15 enero 2024')).toBe('2024-01-15')
    expect(parseDate('1 ago 24')).toBe('2024-08-01')
  })

  it('rejects garbage like "32/13/2024"', () => {
    expect(parseDate('32/13/2024')).toBeNull()
  })
})

// ── normalizeTransactions ────────────────────────────────────────────────────

describe('normalizeTransactions', () => {
  it('ALLOWS amount === 0 (no longer dropped silently)', () => {
    const rows = [{ Fecha: '2024-01-01', Concepto: 'Reembolso', Importe: '0' }]
    const { transactions, needsReview } = normalizeTransactions(rows, baseMapping)
    expect(transactions.length).toBe(1)
    expect(transactions[0].amount).toBe(0)
    expect(needsReview.length).toBe(0)
  })

  it('pushes unparseable amount to needsReview (not silently dropped)', () => {
    const rows = [{ Fecha: '2024-01-01', Concepto: 'X', Importe: 'no-numero' }]
    const { transactions, needsReview } = normalizeTransactions(rows, baseMapping)
    expect(transactions.length).toBe(0)
    expect(needsReview.length).toBe(1)
    expect(needsReview[0].reason).toBe('amount_unparseable')
    expect(needsReview[0].suggestedPatch).toEqual({ amount: null })
  })

  it('pushes unparseable date to needsReview (NOT today)', () => {
    const rows = [{ Fecha: 'fecha-rota', Concepto: 'X', Importe: '100' }]
    const { transactions, needsReview } = normalizeTransactions(rows, baseMapping)
    expect(transactions.length).toBe(0)
    expect(needsReview.length).toBe(1)
    expect(needsReview[0].reason).toBe('date_unparseable')
  })

  it('uses todayIso ONLY when fecha column is not mapped at all', () => {
    const mapping: ColumnMapping = { ...baseMapping, fecha: null }
    const rows = [{ Concepto: 'X', Importe: '100' }]
    const { transactions } = normalizeTransactions(rows, mapping)
    expect(transactions.length).toBe(1)
    expect(transactions[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('handles debe/haber method correctly', () => {
    const dhMapping: ColumnMapping = {
      ...baseMapping,
      monto: null,
      monto_debito: 'Debe',
      monto_credito: 'Haber',
      tipo_metodo: 'debito_credito',
    }
    const rows = [
      { Fecha: '2024-01-02', Concepto: 'Nómina', Debe: '', Haber: '2500,00' },
      { Fecha: '2024-01-03', Concepto: 'Alquiler', Debe: '800,00', Haber: '' },
    ]
    const { transactions, needsReview } = normalizeTransactions(rows, dhMapping)
    expect(needsReview).toEqual([])
    expect(transactions.length).toBe(2)
    expect(transactions[0].type).toBe('income')
    expect(transactions[0].amount).toBe(2500)
    expect(transactions[1].type).toBe('expense')
    expect(transactions[1].amount).toBe(800)
  })

  it('reports missing_type_signal when no signal is available', () => {
    const noSignal: ColumnMapping = {
      ...baseMapping,
      tipo_metodo: 'columna_explicita',
      tipo: 'TipoCol',
    }
    const rows = [{ Fecha: '2024-01-01', Concepto: 'misterioso', Importe: '50', TipoCol: 'algo-raro' }]
    const { transactions, needsReview } = normalizeTransactions(rows, noSignal)
    expect(transactions.length).toBe(0)
    expect(needsReview.length).toBe(1)
    expect(needsReview[0].reason).toBe('missing_type_signal')
  })
})
