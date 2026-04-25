/**
 * Standalone runner mirroring tests/parsers/{date,amount}.test.ts.
 * Vitest hangs silently under Node 25 in this dev env (Vite/worker bug),
 * so this file uses node:assert + `node --experimental-strip-types` to
 * verify the new parsers without a test runner.
 *
 * Run with:  node --experimental-strip-types tests/parsers-smoke.ts
 */
import assert from 'node:assert/strict'
import { parseDate } from '../lib/parsers/date.ts'
import { parseAmount } from '../lib/parsers/amount.ts'

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

// ── parseDate ────────────────────────────────────────────────────────────────
group('parseDate')

test('"15/01/2024" → high', () => {
  assert.deepEqual(parseDate('15/01/2024'), {
    date: '2024-01-15', confidence: 'high', flags: [],
  })
})

test('"22 de enero" with fileYear=2024 → medium + natural_language + year_inferred', () => {
  const r = parseDate('22 de enero', { fileYear: 2024 })
  assert.equal(r.date, '2024-01-22')
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('natural_language'))
  assert.ok(r.flags.includes('year_inferred'))
})

test('"marzo 5" with fileYear=2024 → medium + natural_language + year_inferred', () => {
  const r = parseDate('marzo 5', { fileYear: 2024 })
  assert.equal(r.date, '2024-03-05')
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('natural_language'))
  assert.ok(r.flags.includes('year_inferred'))
})

test('"abril" with fileYear=2024 → low + month_only + year_inferred', () => {
  const r = parseDate('abril', { fileYear: 2024 })
  assert.equal(r.date, '2024-04-01')
  assert.equal(r.confidence, 'low')
  assert.ok(r.flags.includes('month_only'))
  assert.ok(r.flags.includes('year_inferred'))
})

test('"mayo 2024" → medium + month_only (no year_inferred)', () => {
  const r = parseDate('mayo 2024')
  assert.equal(r.date, '2024-05-01')
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('month_only'))
  assert.ok(!r.flags.includes('year_inferred'))
})

test('"20/03/24" → high + two_digit_year', () => {
  const r = parseDate('20/03/24')
  assert.equal(r.date, '2024-03-20')
  assert.equal(r.confidence, 'high')
  assert.ok(r.flags.includes('two_digit_year'))
})

test('Date(2026,1,14) with yearRange=[2024,2024] → suspicious_year + medium', () => {
  const r = parseDate(new Date(2026, 1, 14), { yearRange: [2024, 2024] })
  assert.equal(r.date, '2026-02-14')
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('suspicious_year'))
})

test('Excel serial 45323 → high + excel_serial', () => {
  const r = parseDate(45323)
  assert.equal(r.confidence, 'high')
  assert.ok(r.flags.includes('excel_serial'))
  assert.match(r.date ?? '', /^\d{4}-\d{2}-\d{2}$/)
})

test('"diciembre 2023" → medium + month_only', () => {
  const r = parseDate('diciembre 2023')
  assert.equal(r.date, '2023-12-01')
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('month_only'))
})

test('"feb" with fileYear=2024 → low + month_only + year_inferred', () => {
  const r = parseDate('feb', { fileYear: 2024 })
  assert.equal(r.date, '2024-02-01')
  assert.equal(r.confidence, 'low')
  assert.ok(r.flags.includes('month_only'))
  assert.ok(r.flags.includes('year_inferred'))
})

test('null → null + low + empty', () => {
  assert.deepEqual(parseDate(null), { date: null, confidence: 'low', flags: ['empty'] })
})

// ── parseAmount ──────────────────────────────────────────────────────────────
group('parseAmount')

test('plain number 4500 → high', () => {
  assert.deepEqual(parseAmount(4500), { amount: 4500, confidence: 'high', flags: [] })
})

test('"~18500" → 18500 medium approximation', () => {
  const r = parseAmount('~18500')
  assert.equal(r.amount, 18500)
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('approximation'))
})

test('"variable" → null low non_numeric_placeholder', () => {
  assert.deepEqual(parseAmount('variable'), {
    amount: null, confidence: 'low', flags: ['non_numeric_placeholder'],
  })
})

test('"pendiente" → null low non_numeric_placeholder', () => {
  assert.deepEqual(parseAmount('pendiente'), {
    amount: null, confidence: 'low', flags: ['non_numeric_placeholder'],
  })
})

test('"como 9600" → 9600 medium approximation', () => {
  const r = parseAmount('como 9600')
  assert.equal(r.amount, 9600)
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('approximation'))
})

test('"ni idea" → null low non_numeric_placeholder', () => {
  assert.deepEqual(parseAmount('ni idea'), {
    amount: null, confidence: 'low', flags: ['non_numeric_placeholder'],
  })
})

test('"~37,100??" with decimalSeparator="." → 37100 medium approximation', () => {
  const r = parseAmount('~37,100??', { decimalSeparator: '.' })
  assert.equal(r.amount, 37100)
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('approximation'))
})

test('"#NAME?" → null low excel_error', () => {
  assert.deepEqual(parseAmount('#NAME?'), {
    amount: null, confidence: 'low', flags: ['excel_error'],
  })
})

test('-750 → -750 high', () => {
  assert.deepEqual(parseAmount(-750), { amount: -750, confidence: 'high', flags: [] })
})

test('"1.234,56" with decimalSeparator="," → 1234.56 high', () => {
  assert.deepEqual(parseAmount('1.234,56', { decimalSeparator: ',' }), {
    amount: 1234.56, confidence: 'high', flags: [],
  })
})

test('"1,234.56" with decimalSeparator="." → 1234.56 high', () => {
  assert.deepEqual(parseAmount('1,234.56', { decimalSeparator: '.' }), {
    amount: 1234.56, confidence: 'high', flags: [],
  })
})

test('"$5,000.00 USD" → 5000 high currency_cleaned', () => {
  const r = parseAmount('$5,000.00 USD')
  assert.equal(r.amount, 5000)
  assert.equal(r.confidence, 'high')
  assert.ok(r.flags.includes('currency_cleaned'))
})

test('"ya pago 500, falta 700" → 500 medium multiple_numbers_in_cell extras=[700]', () => {
  const r = parseAmount('ya pago 500, falta 700')
  assert.equal(r.amount, 500)
  assert.equal(r.confidence, 'medium')
  assert.ok(r.flags.includes('multiple_numbers_in_cell'))
  assert.deepEqual(r.extraNumbers, [700])
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
