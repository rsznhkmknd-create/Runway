/**
 * Standalone smoke runner for the region detector.
 * Mirror of tests/parsers/region-detector.test.ts that runs without vitest
 * under Node --experimental-strip-types (vitest hangs under Node 25 in this
 * env). Run via `npm run test:smoke:regions`.
 */
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseUploadedFile } from '../lib/parse-file.ts'
import {
  detectRegions,
  largestRegionOccupancy,
} from '../lib/parsers/region-detector.ts'

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

const FIXTURE = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'imports',
  'Prueba_runway7.xlsx'
)

// ── Real customer file ──────────────────────────────────────────────────────
group('detectRegions on Prueba_runway7.xlsx')

const buf = fs.readFileSync(FIXTURE)
const parsed = parseUploadedFile(buf, 'Prueba_runway7.xlsx')
const sheet = parsed.sheets[0]!
const regions = detectRegions(sheet)

test('detects exactly 5 regions', () => {
  assert.equal(regions.length, 5)
})

const expected = [
  { startRow: 3,  endRow: 15, startCol: 1, endCol: 5,  title: 'VENTAS / INGRESOS' },
  { startRow: 3,  endRow: 10, startCol: 7, endCol: 10, title: 'INVENTARIO RAPIDO' },
  { startRow: 17, endRow: 34, startCol: 1, endCol: 5,  title: 'GASTOS' },
  { startRow: 36, endRow: 41, startCol: 1, endCol: 4,  title: 'DEUDAS / CUENTAS POR COBRAR' },
  { startRow: 43, endRow: 46, startCol: 1, endCol: 5,  title: 'PRESTAMOS' },
]

for (let i = 0; i < expected.length; i++) {
  const exp = expected[i]!
  test(`region ${i + 1} = ${exp.title} at rows ${exp.startRow}-${exp.endRow}, cols ${exp.startCol}-${exp.endCol}`, () => {
    const r = regions[i]
    assert.ok(r, `expected a region at index ${i}`)
    assert.equal(r!.startRow, exp.startRow)
    assert.equal(r!.endRow, exp.endRow)
    assert.equal(r!.startCol, exp.startCol)
    assert.equal(r!.endCol, exp.endCol)
    assert.equal(r!.sectionTitle, exp.title)
    assert.equal(r!.confidence, 'high')
  })
}

test('filters out the RESUMEN block (rows 13-16) by numeric-density rule', () => {
  const titles = regions.map((r) => r.sectionTitle)
  assert.ok(!titles.includes('RESUMEN'))
})

test('rawMatrix slice dimensions match the bbox for every region', () => {
  for (const r of regions) {
    const expRows = r.endRow - r.startRow + 1
    const expCols = r.endCol - r.startCol + 1
    assert.equal(r.rawMatrix.length, expRows)
    assert.equal(r.rawMatrix[0]?.length, expCols)
  }
})

test('largestRegionOccupancy < 0.8 (analyze route will use multi-region path)', () => {
  const occ = largestRegionOccupancy(sheet, regions)
  assert.ok(occ < 0.8, `expected occupancy < 0.8, got ${occ}`)
  assert.ok(occ > 0)
})

// ── Regression: clean single-table sheet stays as 1 region ──────────────────
group('regression: clean single-table sheet')

import('xlsx').then((m) => {
  const X = (m as any).default ?? m
  const aoa = [
    ['Fecha', 'Concepto', 'Monto'],
    ['2024-01-01', 'Venta', 1000],
    ['2024-01-02', 'Renta', -500],
    ['2024-01-03', 'Cobro', 750],
    ['2024-01-04', 'Suministros', -120],
  ]
  const ws = X.utils.aoa_to_sheet(aoa)
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, ws, 'Clean')
  const cleanBuf = X.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const cleanParsed = parseUploadedFile(cleanBuf, 'clean.xlsx')
  const cleanSheet = cleanParsed.sheets[0]!
  const cleanRegions = detectRegions(cleanSheet)

  test('returns exactly 1 region for a clean sheet', () => {
    assert.equal(cleanRegions.length, 1)
  })

  test('largestRegionOccupancy > 0.8 → legacy single-table path', () => {
    const occ = largestRegionOccupancy(cleanSheet, cleanRegions)
    assert.ok(occ > 0.8, `expected occupancy > 0.8, got ${occ}`)
  })

  // Summary
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Tests:  ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log(`\nFailures:`)
    for (const f of failures) console.log(`  • ${f}`)
    process.exit(1)
  }
  console.log('All assertions passed.')
  process.exit(0)
})
