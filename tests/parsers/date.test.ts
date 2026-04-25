import { describe, it, expect } from 'vitest'
import { parseDate } from '@/lib/parsers/date'

describe('parseDate', () => {
  it('parses DD/MM/YYYY → high', () => {
    const r = parseDate('15/01/2024')
    expect(r).toEqual({ date: '2024-01-15', confidence: 'high', flags: [] })
  })

  it('parses "22 de enero" with fileYear → medium + natural_language + year_inferred', () => {
    const r = parseDate('22 de enero', { fileYear: 2024 })
    expect(r.date).toBe('2024-01-22')
    expect(r.confidence).toBe('medium')
    expect(r.flags).toEqual(expect.arrayContaining(['natural_language', 'year_inferred']))
  })

  it('parses "marzo 5" with fileYear → medium + natural_language + year_inferred', () => {
    const r = parseDate('marzo 5', { fileYear: 2024 })
    expect(r.date).toBe('2024-03-05')
    expect(r.confidence).toBe('medium')
    expect(r.flags).toEqual(expect.arrayContaining(['natural_language', 'year_inferred']))
  })

  it('parses "abril" with fileYear → low + month_only + year_inferred', () => {
    const r = parseDate('abril', { fileYear: 2024 })
    expect(r.date).toBe('2024-04-01')
    expect(r.confidence).toBe('low')
    expect(r.flags).toEqual(expect.arrayContaining(['month_only', 'year_inferred']))
  })

  it('parses "mayo 2024" → medium + month_only (no year_inferred — explicit year)', () => {
    const r = parseDate('mayo 2024')
    expect(r.date).toBe('2024-05-01')
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('month_only')
    expect(r.flags).not.toContain('year_inferred')
  })

  it('parses DD/MM/YY → high + two_digit_year', () => {
    const r = parseDate('20/03/24')
    expect(r.date).toBe('2024-03-20')
    expect(r.confidence).toBe('high')
    expect(r.flags).toContain('two_digit_year')
  })

  it('Date instance with yearRange that excludes the year → suspicious_year + drop to medium', () => {
    const r = parseDate(new Date(2026, 1, 14), { yearRange: [2024, 2024] })
    expect(r.date).toBe('2026-02-14')
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('suspicious_year')
  })

  it('Excel serial 45323 → high + excel_serial', () => {
    const r = parseDate(45323)
    expect(r.confidence).toBe('high')
    expect(r.flags).toContain('excel_serial')
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parses "diciembre 2023" → medium + month_only', () => {
    const r = parseDate('diciembre 2023')
    expect(r.date).toBe('2023-12-01')
    expect(r.confidence).toBe('medium')
    expect(r.flags).toContain('month_only')
  })

  it('parses "feb" with fileYear → low + month_only + year_inferred', () => {
    const r = parseDate('feb', { fileYear: 2024 })
    expect(r.date).toBe('2024-02-01')
    expect(r.confidence).toBe('low')
    expect(r.flags).toEqual(expect.arrayContaining(['month_only', 'year_inferred']))
  })

  it('null input → null + low + empty', () => {
    const r = parseDate(null)
    expect(r).toEqual({ date: null, confidence: 'low', flags: ['empty'] })
  })
})
