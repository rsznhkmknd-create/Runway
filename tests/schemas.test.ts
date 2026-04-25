import { describe, it, expect } from 'vitest'
import {
  ColumnMappingSchema,
  NormalizedTransactionSchema,
  ImportBodySchema,
} from '@/lib/schemas/import'

const validMapping = {
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
  notas: 'Extracto bancario español',
}

describe('ColumnMappingSchema', () => {
  it('accepts a valid mapping', () => {
    const result = ColumnMappingSchema.safeParse(validMapping)
    expect(result.success).toBe(true)
  })

  it('rejects mapping without monto NOR debe/haber pair', () => {
    const bad = { ...validMapping, monto: null, monto_debito: null, monto_credito: null }
    const result = ColumnMappingSchema.safeParse(bad)
    expect(result.success).toBe(false)
    if (!result.success) {
      const path = result.error.issues[0].path.join('.')
      expect(path).toBe('monto')
    }
  })

  it('accepts mapping with debe/haber even if monto is null', () => {
    const dh = {
      ...validMapping,
      monto: null,
      monto_debito: 'Debe',
      monto_credito: 'Haber',
      tipo_metodo: 'debito_credito',
    }
    expect(ColumnMappingSchema.safeParse(dh).success).toBe(true)
  })

  it('rejects an invalid tipo_metodo', () => {
    const bad = { ...validMapping, tipo_metodo: 'magic_unicorn' }
    const result = ColumnMappingSchema.safeParse(bad)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('tipo_metodo'))).toBe(true)
    }
  })

  it('coerces the string "null" to actual null', () => {
    const result = ColumnMappingSchema.safeParse({ ...validMapping, fecha: 'null' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.fecha).toBeNull()
  })

  it('rejects an invalid confidence value', () => {
    const bad = { ...validMapping, confidence: 'super-high' }
    expect(ColumnMappingSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts header_row when provided', () => {
    const r = ColumnMappingSchema.safeParse({ ...validMapping, header_row: 5 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.header_row).toBe(5)
  })

  it('rejects negative header_row', () => {
    expect(
      ColumnMappingSchema.safeParse({ ...validMapping, header_row: -1 }).success
    ).toBe(false)
  })
})

describe('NormalizedTransactionSchema', () => {
  it('accepts a valid transaction', () => {
    const r = NormalizedTransactionSchema.safeParse({
      amount: 123.45,
      type: 'expense',
      category: 'Alimentación',
      description: 'Mercadona',
      date: '2024-01-15',
    })
    expect(r.success).toBe(true)
  })

  it('rejects bad date format', () => {
    const r = NormalizedTransactionSchema.safeParse({
      amount: 1,
      type: 'expense',
      category: 'X',
      description: '',
      date: '15/01/2024',
    })
    expect(r.success).toBe(false)
  })

  it('rejects non-finite amount', () => {
    const r = NormalizedTransactionSchema.safeParse({
      amount: Number.POSITIVE_INFINITY,
      type: 'income',
      category: 'X',
      description: '',
      date: '2024-01-15',
    })
    expect(r.success).toBe(false)
  })

  it('rejects empty category', () => {
    const r = NormalizedTransactionSchema.safeParse({
      amount: 1,
      type: 'income',
      category: '',
      description: '',
      date: '2024-01-15',
    })
    expect(r.success).toBe(false)
  })
})

describe('ImportBodySchema', () => {
  it('accepts transactions only', () => {
    const r = ImportBodySchema.safeParse({
      transactions: [
        {
          amount: 1, type: 'income', category: 'X', description: '', date: '2024-01-01',
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('accepts transactions + needsReviewApproved', () => {
    const r = ImportBodySchema.safeParse({
      transactions: [],
      needsReviewApproved: [
        {
          amount: 99, type: 'expense', category: 'Y', description: 'fixed', date: '2024-02-01',
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('rejects body where transactions is missing', () => {
    expect(ImportBodySchema.safeParse({}).success).toBe(false)
  })
})
