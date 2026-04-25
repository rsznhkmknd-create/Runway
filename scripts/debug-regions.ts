#!/usr/bin/env node
/**
 * CLI: load an Excel/CSV file, parse it, run the region detector, and print
 * each detected region's bounding box + section title + a sample of its top
 * rows. Use this when triaging a customer file you suspect contains multiple
 * tables in one sheet.
 *
 * Usage:
 *   node --experimental-strip-types --import \
 *     'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tests/ts-loader.mjs", pathToFileURL("./"));' \
 *     scripts/debug-regions.ts <path-to-xlsx>
 *
 * Or via the npm script:
 *   npm run debug:regions -- <path-to-xlsx>
 */
import * as fs from 'node:fs'
import { parseUploadedFile } from '../lib/parse-file.ts'
import { detectRegions, largestRegionOccupancy } from '../lib/parsers/region-detector.ts'

const path = process.argv[2]
if (!path) {
  console.error('Usage: debug-regions.ts <path-to-xlsx>')
  process.exit(1)
}

if (!fs.existsSync(path)) {
  console.error(`File not found: ${path}`)
  process.exit(1)
}

const buf = fs.readFileSync(path)
const parsed = parseUploadedFile(buf, path)

console.log(`File: ${path}`)
console.log(`Sheets: ${parsed.sheets.length}`)
if (parsed.warnings.length) {
  console.log(`Warnings:`)
  for (const w of parsed.warnings) console.log(`  - ${w}`)
}

for (const sheet of parsed.sheets) {
  console.log(
    `\n──── Sheet "${sheet.name}" (${sheet.rawMatrix.length} rows × ${
      Math.max(...sheet.rawMatrix.map((r) => r.length), 0)
    } cols, decimalSeparator=${sheet.locale.decimalSeparator}) ────`
  )
  const regions = detectRegions(sheet)
  const occ = largestRegionOccupancy(sheet, regions)
  console.log(
    `Detected ${regions.length} region(s). Largest covers ${(occ * 100).toFixed(1)}% of non-empty cells.`
  )
  for (const r of regions) {
    const rows = r.endRow - r.startRow + 1
    const cols = r.endCol - r.startCol + 1
    console.log(
      `\n  [${r.id}]  rows ${r.startRow}-${r.endRow}, cols ${r.startCol}-${r.endCol}` +
        `  (${rows}×${cols})  confidence=${r.confidence}`
    )
    if (r.sectionTitle) console.log(`    sectionTitle: "${r.sectionTitle}"`)
    const preview = r.rawMatrix.slice(0, 4)
    for (let i = 0; i < preview.length; i++) {
      const row = (preview[i] ?? []).map((v) => {
        const s = String(v ?? '')
        return s.length > 24 ? s.slice(0, 22) + '…' : s
      })
      console.log(`    row ${r.startRow + i}: ${JSON.stringify(row)}`)
    }
    if (r.rawMatrix.length > 4) {
      console.log(`    … (${r.rawMatrix.length - 4} more row(s))`)
    }
  }
}
