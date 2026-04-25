import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseUploadedFile } from '@/lib/parse-file'
import {
  detectRegions,
  largestRegionOccupancy,
} from '@/lib/parsers/region-detector'

const FIXTURE = path.join(
  __dirname,
  '..',
  'fixtures',
  'imports',
  'Prueba_runway7.xlsx'
)

describe('detectRegions on Prueba_runway7.xlsx', () => {
  const buf = fs.readFileSync(FIXTURE)
  const parsed = parseUploadedFile(buf, 'Prueba_runway7.xlsx')
  const sheet = parsed.sheets[0]!
  const regions = detectRegions(sheet)

  it('detects exactly 5 regions', () => {
    expect(regions.length).toBe(5)
  })

  it('region 1 = VENTAS / INGRESOS at rows 3-15, cols 1-5', () => {
    const r = regions[0]!
    expect(r.startRow).toBe(3)
    expect(r.endRow).toBe(15)
    expect(r.startCol).toBe(1)
    expect(r.endCol).toBe(5)
    expect(r.sectionTitle).toBe('VENTAS / INGRESOS')
    expect(r.confidence).toBe('high')
  })

  it('region 2 = INVENTARIO RAPIDO at rows 3-10, cols 7-10', () => {
    const r = regions[1]!
    expect(r.startRow).toBe(3)
    expect(r.endRow).toBe(10)
    expect(r.startCol).toBe(7)
    expect(r.endCol).toBe(10)
    expect(r.sectionTitle).toBe('INVENTARIO RAPIDO')
  })

  it('region 3 = GASTOS at rows 17-34, cols 1-5', () => {
    const r = regions[2]!
    expect(r.startRow).toBe(17)
    expect(r.endRow).toBe(34)
    expect(r.startCol).toBe(1)
    expect(r.endCol).toBe(5)
    expect(r.sectionTitle).toBe('GASTOS')
  })

  it('region 4 = DEUDAS / CUENTAS POR COBRAR at rows 36-41, cols 1-4', () => {
    const r = regions[3]!
    expect(r.startRow).toBe(36)
    expect(r.endRow).toBe(41)
    expect(r.startCol).toBe(1)
    expect(r.endCol).toBe(4)
    expect(r.sectionTitle).toBe('DEUDAS / CUENTAS POR COBRAR')
  })

  it('region 5 = PRESTAMOS at rows 43-46, cols 1-5', () => {
    const r = regions[4]!
    expect(r.startRow).toBe(43)
    expect(r.endRow).toBe(46)
    expect(r.startCol).toBe(1)
    expect(r.endCol).toBe(5)
    expect(r.sectionTitle).toBe('PRESTAMOS')
  })

  it('filters out the RESUMEN block (rows 13-16, cols 7-9) by numeric-density rule', () => {
    // RESUMEN has 2 numeric cells (98650 + 45949) — under the 4-cell threshold.
    const titles = regions.map((r) => r.sectionTitle)
    expect(titles).not.toContain('RESUMEN')
  })

  it('all regions slice rawMatrix matches their bbox', () => {
    for (const r of regions) {
      const expectedRows = r.endRow - r.startRow + 1
      const expectedCols = r.endCol - r.startCol + 1
      expect(r.rawMatrix.length).toBe(expectedRows)
      expect(r.rawMatrix[0]?.length).toBe(expectedCols)
    }
  })

  it('largestRegionOccupancy < 0.8 (so the analyze route will use the multi-region path)', () => {
    const occ = largestRegionOccupancy(sheet, regions)
    expect(occ).toBeLessThan(0.8)
    expect(occ).toBeGreaterThan(0)
  })
})

describe('detectRegions on a single-table sheet (regression — clean files unchanged)', () => {
  // Build a clean single-table sheet inline (no fixture needed).
  it('returns 1 region for a clean sheet', async () => {
    const XLSX = await import('xlsx').then((m) => m.default ?? m)
    const aoa = [
      ['Fecha', 'Concepto', 'Monto'],
      ['2024-01-01', 'Venta', 1000],
      ['2024-01-02', 'Renta', -500],
      ['2024-01-03', 'Cobro', 750],
      ['2024-01-04', 'Suministros', -120],
    ]
    const ws = (XLSX as typeof import('xlsx')).utils.aoa_to_sheet(aoa)
    const wb = (XLSX as typeof import('xlsx')).utils.book_new()
    ;(XLSX as typeof import('xlsx')).utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = (XLSX as typeof import('xlsx')).write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer
    const p = parseUploadedFile(buf, 'clean.xlsx')
    const r = detectRegions(p.sheets[0]!)
    expect(r.length).toBe(1)
    const occ = largestRegionOccupancy(p.sheets[0]!, r)
    expect(occ).toBeGreaterThan(0.8)
  })
})
