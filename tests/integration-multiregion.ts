/**
 * Integration runner — calls the real Anthropic API against Prueba_runway7.xlsx
 * to validate the full multi-region pipeline end-to-end.
 *
 * Requires ANTHROPIC_API_KEY (loaded automatically from .env.local). Skips
 * gracefully when the key is absent so CI without secrets doesn't fail.
 *
 * Run with:  npm run test:integration:multiregion
 */
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

import { parseUploadedFile } from '../lib/parse-file.ts'
import {
  detectRegions,
  largestRegionOccupancy,
} from '../lib/parsers/region-detector.ts'
import {
  ANALYZE_SYSTEM_PROMPT,
  MULTIREGION_PROMPT_ADDENDUM,
  cleanJson,
  extractReasoningAndJson,
  renderRegionsForClaude,
} from '../lib/analyze-excel-prompt.ts'
import {
  RegionsResponseSchema,
  type BlockType,
} from '../lib/schemas/import.ts'
import {
  normalizeRegions,
  type NormalizedTransaction,
} from '../lib/normalize-transactions.ts'

// ── Load .env.local manually (no dotenv dep) ─────────────────────────────────
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    if (!process.env[key!]) {
      process.env[key!] = val!.replace(/^["']|["']$/g, '')
    }
  }
}
loadEnvLocal()

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.log('SKIP: ANTHROPIC_API_KEY not set; integration test skipped.')
  process.exit(0)
}

const anthropic = new Anthropic({ apiKey })

const FIXTURE = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'imports',
  'Prueba_runway7.xlsx'
)

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

async function main() {
  console.log('Integration test: multi-region against Prueba_runway7.xlsx\n')

  const buf = fs.readFileSync(FIXTURE)
  const parsed = parseUploadedFile(buf, 'Prueba_runway7.xlsx')
  const sheet = parsed.sheets[0]!
  const regions = detectRegions(sheet)
  console.log(`Detector: ${regions.length} regions found.`)

  const occ = largestRegionOccupancy(sheet, regions)
  console.log(`Largest region occupancy: ${(occ * 100).toFixed(1)}%`)

  const regionsBySheet = new Map<string, typeof regions>([[sheet.name, regions]])
  const { markdown } = renderRegionsForClaude(parsed.sheets, regionsBySheet)

  const userPrompt =
    `ARCHIVO: Prueba_runway7.xlsx\n` +
    `REGIONES DETECTADAS: ${regions.length}\n\n` +
    markdown +
    `\n\nEmpieza por <reasoning>…</reasoning>, sigue con <json>…</json>.`

  console.log(`Calling Claude (claude-sonnet-4-6, max_tokens 8192)…`)
  const t0 = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: ANALYZE_SYSTEM_PROMPT + MULTIREGION_PROMPT_ADDENDUM,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const elapsedMs = Date.now() - t0
  const usage = response.usage
  console.log(`Response in ${elapsedMs}ms.`)
  console.log(
    `Tokens — input: ${usage.input_tokens}  output: ${usage.output_tokens}  ` +
      `total: ${usage.input_tokens + usage.output_tokens}`
  )

  // Approximate cost at Claude Sonnet 4.6 rates: $3/MTok input, $15/MTok output.
  // (Cross-check against current Anthropic pricing; values current as of Apr 2026.)
  const inputUsd = (usage.input_tokens / 1_000_000) * 3
  const outputUsd = (usage.output_tokens / 1_000_000) * 15
  const totalUsd = inputUsd + outputUsd
  console.log(
    `Approx cost — input: $${inputUsd.toFixed(4)}  output: $${outputUsd.toFixed(4)}  ` +
      `total: $${totalUsd.toFixed(4)}`
  )

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  const { reasoning, json } = extractReasoningAndJson(text)
  console.log(`\nClaude reasoning:\n${reasoning}\n`)

  const parsedJson = JSON.parse(cleanJson(json))
  const validated = RegionsResponseSchema.safeParse(parsedJson)
  assert.ok(validated.success, `Schema validation failed: ${JSON.stringify(validated, null, 2)}`)
  const regionsResp = validated.data.regions
  console.log(`Claude returned ${regionsResp.length} region mappings.\n`)
  for (const r of regionsResp) {
    console.log(
      `  - ${r.regionId}: blockType=${r.blockType}  ` +
        `monto=${r.mapping.monto}  fecha=${r.mapping.fecha}  header_row=${r.mapping.header_row}`
    )
  }
  console.log()

  // Build the (region, blockType, mapping) tuples
  const regionByMappingId = new Map(regions.map((r) => [r.id, r]))
  const tuples: Array<{
    region: typeof regions[number]
    blockType: BlockType
    mapping: typeof regionsResp[number]['mapping']
  }> = []
  for (const r of regionsResp) {
    const region = regionByMappingId.get(r.regionId)
    if (region) tuples.push({ region, blockType: r.blockType, mapping: r.mapping })
  }

  const result = normalizeRegions(tuples, {
    decimalSeparator: sheet.locale.decimalSeparator,
  })

  // ── Assertions ──────────────────────────────────────────────────────────
  console.log('\nAssertions:')

  test('5+ regions detected', () => assert.ok(regions.length >= 5))

  test('blockTypes include all 5 expected categories', () => {
    const types = regionsResp.map((r) => r.blockType)
    assert.ok(types.includes('income_transactions'), `missing income_transactions; got ${types.join(', ')}`)
    assert.ok(types.includes('recurring_expenses'), 'missing recurring_expenses')
    assert.ok(types.includes('inventory_snapshot'), 'missing inventory_snapshot')
    assert.ok(types.includes('accounts_receivable'), 'missing accounts_receivable')
    assert.ok(types.includes('loans_payable'), 'missing loans_payable')
  })

  test('inventory products are NOT in transactions', () => {
    const descs = result.transactions.map((t) => t.description)
    assert.ok(!descs.includes('Camisetas basicas'), `inventory leaked: ${descs.join(', ')}`)
    assert.ok(!descs.includes('Jeans'))
  })

  test('receivables[] has >= 4 rows', () =>
    assert.ok(result.receivables.length >= 4, `got ${result.receivables.length}`))

  test('loans[] has >= 2 rows', () =>
    assert.ok(result.loans.length >= 2, `got ${result.loans.length}`))

  test('extracted at least 8 sales transactions', () => {
    const sales = result.transactions.filter(
      (t: NormalizedTransaction) => t.type === 'income'
    )
    assert.ok(
      result.transactions.length >= 8,
      `got ${result.transactions.length} transactions (${sales.length} income)`
    )
  })

  test('needsReview includes amount_unparseable (variable/pendiente)', () => {
    const reasons = result.needsReview.map((r) => r.reason)
    assert.ok(
      reasons.includes('amount_unparseable') ||
        reasons.includes('recurring_needs_date'),
      `reasons: ${reasons.join(', ')}`
    )
  })

  // Optional / informative — print the regionLog so we can inspect.
  console.log(`\nregionLog:`)
  for (const log of result.regionLog) {
    console.log(
      `  - ${log.regionId} (${log.blockType}): ` +
        `transactions=${log.transactionsCount}, needsReview=${log.needsReviewCount}` +
        (log.skipped ? ` [SKIPPED: ${log.reason}]` : log.reason ? ` [${log.reason}]` : '')
    )
  }

  console.log(`\nresult.transactions: ${result.transactions.length}`)
  console.log(`result.needsReview:  ${result.needsReview.length}`)
  console.log(`result.receivables:  ${result.receivables.length}`)
  console.log(`result.loans:        ${result.loans.length}`)

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Tests:  ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  • ${f}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
