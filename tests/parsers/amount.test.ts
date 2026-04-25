import { describe, it, expect } from 'vitest'
import { parseAmount } from '@/lib/parsers/amount'

describe('parseAmount', () => {
  it('plain number → high', () => {
    expect(parseAmount(4500)).toEqual({ amount: 4500, confidence: 'high', flags: [] })
  })

  it('"~18500" → 18500 medium approximation', () => {
    const r = parseAmount('~18500')
    expect(r.amount).toBe(18500)
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('approximation')
  })

  it('"variable" → null low non_numeric_placeholder', () => {
    expect(parseAmount('variable')).toEqual({
      amount: null, confidence: 'low', flags: ['non_numeric_placeholder'],
    })
  })

  it('"pendiente" → null low non_numeric_placeholder', () => {
    expect(parseAmount('pendiente')).toEqual({
      amount: null, confidence: 'low', flags: ['non_numeric_placeholder'],
    })
  })

  it('"como 9600" → 9600 medium approximation', () => {
    const r = parseAmount('como 9600')
    expect(r.amount).toBe(9600)
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('approximation')
  })

  it('"ni idea" → null low non_numeric_placeholder', () => {
    expect(parseAmount('ni idea')).toEqual({
      amount: null, confidence: 'low', flags: ['non_numeric_placeholder'],
    })
  })

  it('"~37,100??" with decimalSeparator="." → 37100 medium approximation', () => {
    const r = parseAmount('~37,100??', { decimalSeparator: '.' })
    expect(r.amount).toBe(37100)
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('approximation')
  })

  it('"#NAME?" → null low excel_error', () => {
    expect(parseAmount('#NAME?')).toEqual({
      amount: null, confidence: 'low', flags: ['excel_error'],
    })
  })

  it('-750 → -750 high', () => {
    expect(parseAmount(-750)).toEqual({ amount: -750, confidence: 'high', flags: [] })
  })

  it('"1.234,56" with decimalSeparator="," → 1234.56 high', () => {
    expect(parseAmount('1.234,56', { decimalSeparator: ',' })).toEqual({
      amount: 1234.56, confidence: 'high', flags: [],
    })
  })

  it('"1,234.56" with decimalSeparator="." → 1234.56 high', () => {
    expect(parseAmount('1,234.56', { decimalSeparator: '.' })).toEqual({
      amount: 1234.56, confidence: 'high', flags: [],
    })
  })

  it('"$5,000.00 USD" → 5000 high currency_cleaned', () => {
    const r = parseAmount('$5,000.00 USD')
    expect(r.amount).toBe(5000)
    expect(r.confidence).toBe('high')
    expect(r.flags).toContain('currency_cleaned')
  })

  it('"ya pago 500, falta 700" → 500 medium multiple_numbers_in_cell extras=[700]', () => {
    const r = parseAmount('ya pago 500, falta 700')
    expect(r.amount).toBe(500)
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('multiple_numbers_in_cell')
    expect(r.extraNumbers).toEqual([700])
  })
})
