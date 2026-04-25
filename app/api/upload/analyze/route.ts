import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { anthropic } from '@/lib/claude'
import {
  parseUploadedFile,
  reindexSheetWithHeaderRow,
  type ParsedSheet,
} from '@/lib/parse-file'
import {
  normalizeTransactions,
  normalizeRegions,
  type ColumnMapping,
  type NormalizedTransaction,
  type NeedsReviewRow,
  type ReceivableRow,
  type LoanRow,
  type MultiRegionResult,
} from '@/lib/normalize-transactions'
import {
  ColumnMappingSchema,
  RegionsResponseSchema,
  formatZodIssues,
  type BlockType,
} from '@/lib/schemas/import'
import { inferCategoriesFromDescriptions } from '@/lib/infer-categories'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'
import {
  ANALYZE_SYSTEM_PROMPT,
  MULTIREGION_PROMPT_ADDENDUM,
  buildAnalyzeUserPrompt,
  cleanJson,
  extractReasoningAndJson,
  renderSheetsForClaude,
  renderRegionsForClaude,
} from '@/lib/analyze-excel-prompt'
import {
  detectRegions,
  largestRegionOccupancy,
  type DetectedRegion,
} from '@/lib/parsers/region-detector'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods']
const MAX_SIZE = 10 * 1024 * 1024

// ─────────────────────────────────────────────────────────────────────────────
// Multi-region path — runs when 2+ regions are detected, or when a single
// region covers <=80% of its sheet (i.e. the sheet has tables + scattered
// notes/totals around). Asks Claude for one mapping per region in a single
// call, then routes each region through the normalizer based on its blockType.
// ─────────────────────────────────────────────────────────────────────────────
async function runMultiRegion(
  allSheets: ParsedSheet[],
  regionsBySheet: Map<string, DetectedRegion[]>,
  allRegions: Array<{ sheet: ParsedSheet; region: DetectedRegion }>,
  filename: string,
  warnings: string[]
) {
  const { markdown, truncated } = renderRegionsForClaude(allSheets, regionsBySheet)
  if (truncated) {
    warnings.push(
      'El archivo tenía demasiadas regiones para enviar a la IA — algunas se omitieron.'
    )
  }

  const userPrompt =
    `ARCHIVO: ${filename}\n` +
    `REGIONES DETECTADAS: ${allRegions.length} (en ${allSheets.length} hoja(s))\n\n` +
    `Cada región se te pasa con su \`regionId\`, \`sectionTitle\` y rawMatrix como tabla markdown ` +
    `(la columna "row" empieza en 1 LOCAL a la región, no a la hoja). Devuelve un objeto ` +
    `\`{ "regions": [...] }\` con un mapping por región como te indica el system prompt.\n\n` +
    markdown +
    `\n\nEmpieza por <reasoning>…</reasoning>, sigue con <json>…</json>.`

  let regionsResp: Array<{ regionId: string; blockType: BlockType; mapping: ColumnMapping }> = []
  let claudeReasoning = ''
  let usage: { input_tokens?: number; output_tokens?: number } = {}
  let claudeFailureReason: null | 'empty_json' | 'invalid_json' | 'schema_invalid' | 'api_error' = null
  let claudeFailureDetail: string | null = null

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: ANALYZE_SYSTEM_PROMPT + MULTIREGION_PROMPT_ADDENDUM,
      messages: [{ role: 'user', content: userPrompt }],
    })
    usage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    }

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const { reasoning, json } = extractReasoningAndJson(text)
    claudeReasoning = reasoning

    if (!json) {
      claudeFailureReason = 'empty_json'
      claudeFailureDetail = 'Claude no devolvió un bloque <json>.'
    } else {
      try {
        const rawJson = JSON.parse(cleanJson(json))
        const result = RegionsResponseSchema.safeParse(rawJson)
        if (!result.success) {
          claudeFailureReason = 'schema_invalid'
          const issues = formatZodIssues(result.error)
          claudeFailureDetail = issues.map((i) => `${i.path}: ${i.message}`).join(' | ')
          console.error('[analyze:multi] schema validation failed:', issues)
        } else {
          regionsResp = result.data.regions
        }
      } catch (e) {
        claudeFailureReason = 'invalid_json'
        claudeFailureDetail = e instanceof Error ? e.message : 'JSON parse error'
        console.error('[analyze:multi] JSON parse error:', e, json.slice(0, 400))
      }
    }
  } catch (err) {
    console.error('[analyze:multi] Claude call error:', err)
    claudeFailureReason = 'api_error'
    claudeFailureDetail = err instanceof Error ? err.message : 'Unknown API error'
  }

  if (claudeFailureReason) {
    return NextResponse.json(
      {
        error: 'La IA no devolvió mappings válidos para las regiones detectadas.',
        reason: claudeFailureReason,
        detail: claudeFailureDetail,
        reasoning: claudeReasoning,
      },
      { status: 400 }
    )
  }

  // Build the (region, blockType, mapping) tuples by joining Claude's response
  // with our detected regions on regionId.
  const regionByMappingId = new Map<string, DetectedRegion>(
    allRegions.map(({ region }) => [region.id, region])
  )
  const tuples: Array<{
    region: DetectedRegion
    blockType: BlockType
    mapping: ColumnMapping
  }> = []
  const unmatched: string[] = []
  for (const r of regionsResp) {
    const region = regionByMappingId.get(r.regionId)
    if (!region) {
      unmatched.push(r.regionId)
      continue
    }
    tuples.push({ region, blockType: r.blockType, mapping: r.mapping })
  }
  if (unmatched.length) {
    warnings.push(
      `La IA devolvió mappings para regiones desconocidas: ${unmatched.join(', ')}. Se ignoraron.`
    )
  }

  // For decimalSeparator we use the locale of the first sheet (regions
  // generally share a single sheet's locale).
  const decimalSeparator = allSheets[0]?.locale.decimalSeparator
  const result: MultiRegionResult = normalizeRegions(tuples, { decimalSeparator })

  // Infer categories for transactions that came back without one (cheap +
  // matches the single-region behaviour).
  if (result.transactions.length > 0) {
    try {
      const descriptions = result.transactions.map((t) => t.description)
      const categories = await inferCategoriesFromDescriptions(descriptions)
      for (let i = 0; i < result.transactions.length; i++) {
        if (categories[i]) result.transactions[i]!.category = categories[i]!
      }
    } catch (err) {
      console.error('[analyze:multi] category inference failed:', err)
    }
  }

  // Banner-style warnings for receivables/loans (backend not built yet).
  if (result.receivables.length > 0) {
    warnings.push(
      `Detectamos ${result.receivables.length} cuenta(s) por cobrar — funcionalidad próximamente, no se importarán como transacciones.`
    )
  }
  if (result.loans.length > 0) {
    warnings.push(
      `Detectamos ${result.loans.length} préstamo(s) — funcionalidad próximamente, no se importarán como transacciones.`
    )
  }
  if (result.needsReview.length > 0) {
    warnings.push(
      `${result.needsReview.length} fila(s) requieren revisión manual antes de importarse.`
    )
  }

  const preview = result.transactions.slice(0, 5)

  return NextResponse.json({
    filename,
    totalRegions: allRegions.length,
    totalTransactions: result.transactions.length,
    preview,
    transactions: result.transactions,
    needsReview: result.needsReview,
    receivables: result.receivables,
    loans: result.loans,
    regions: tuples.map(({ region, blockType }) => ({
      regionId: region.id,
      sheetName: region.sheetName,
      sectionTitle: region.sectionTitle,
      startRow: region.startRow,
      endRow: region.endRow,
      startCol: region.startCol,
      endCol: region.endCol,
      blockType,
    })),
    warnings,
    meta: {
      mode: 'multi-region',
      sheetsCount: allSheets.length,
      reasoning: claudeReasoning,
      regionLog: result.regionLog,
      usage,
      claudeFailureReason: null as null,
    },
  })
}

function pickSheet(sheets: ParsedSheet[], mappingSheet: string | null | undefined): ParsedSheet {
  if (mappingSheet) {
    const match = sheets.find(
      (s) => s.name.trim().toLowerCase() === mappingSheet.trim().toLowerCase()
    )
    if (match) return match
  }
  // Otherwise pick the sheet with the most matrix rows.
  const byRows = [...sheets].sort((a, b) => b.rawMatrix.length - a.rawMatrix.length)
  return byRows[0]
}

export const POST = withRateLimit(async (req: Request) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // ── Form data ──────────────────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  const filename = file.name
  const lowerName = filename.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  if (!hasValidExt) {
    return NextResponse.json(
      { error: `Formato no soportado. Acepta: ${ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 })
  }

  // ── Parse ──────────────────────────────────────────────────────────────────
  let parsed
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    parsed = parseUploadedFile(buffer, filename)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Formato inválido' },
      { status: 422 }
    )
  }

  const allSheets = parsed.sheets
  const warnings = [...parsed.warnings]

  if (allSheets.length === 0 || allSheets.every((s) => s.rawMatrix.length === 0)) {
    return NextResponse.json(
      { error: 'El archivo no contiene filas con datos.' },
      { status: 422 }
    )
  }

  // ── Region detection (deterministic, sin IA) ──────────────────────────────
  // Single-region path (legacy) when EITHER:
  //   - no region passes filters (let the old flow handle the whole sheet), OR
  //   - exactly one region covers >80% of the sheet's non-empty cells (clean file).
  // Multi-region path otherwise.
  type RegionEntry = { sheet: ParsedSheet; region: DetectedRegion }
  const regionsBySheet = new Map<string, DetectedRegion[]>()
  const allRegions: RegionEntry[] = []
  for (const sheet of allSheets) {
    const regs = detectRegions(sheet)
    regionsBySheet.set(sheet.name, regs)
    for (const r of regs) allRegions.push({ sheet, region: r })
  }

  let useMultiRegion = false
  if (allRegions.length >= 2) {
    useMultiRegion = true
  } else if (allRegions.length === 1) {
    const occ = largestRegionOccupancy(allRegions[0]!.sheet, [allRegions[0]!.region])
    if (occ <= 0.8) useMultiRegion = true
  }

  if (useMultiRegion) {
    return runMultiRegion(allSheets, regionsBySheet, allRegions, filename, warnings)
  }

  // ── Render full content for Claude — ALL rows, ALL sheets ──────────────────
  const { markdown, truncated, rowCounts } = renderSheetsForClaude(allSheets)
  if (truncated) {
    warnings.push(
      'El archivo es enorme; se enviaron los bordes (top + bottom) de cada hoja a la IA. Los datos completos sí se procesan después.'
    )
  }

  const userPrompt = buildAnalyzeUserPrompt({
    filename,
    sheets: allSheets,
    markdown,
    truncated,
  })

  // ── Call Claude (chain-of-thought, max_tokens 8192) ────────────────────────
  let mapping: ColumnMapping | null = null
  let claudeReasoning = ''
  let claudeFailureReason: null | 'empty_json' | 'invalid_json' | 'schema_invalid' | 'api_error' = null
  let claudeFailureDetail: string | null = null

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: ANALYZE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const { reasoning, json } = extractReasoningAndJson(text)
    claudeReasoning = reasoning

    if (!json) {
      claudeFailureReason = 'empty_json'
      claudeFailureDetail = 'Claude no devolvió un bloque <json>.'
    } else {
      try {
        const rawJson = JSON.parse(cleanJson(json))
        const result = ColumnMappingSchema.safeParse(rawJson)
        if (!result.success) {
          claudeFailureReason = 'schema_invalid'
          const issues = formatZodIssues(result.error)
          claudeFailureDetail = issues
            .map((i) => `${i.path}: ${i.message}`)
            .join(' | ')
          console.error('[analyze] schema validation failed:', issues)
        } else {
          mapping = { ...result.data, reasoning } as ColumnMapping
        }
      } catch (e) {
        claudeFailureReason = 'invalid_json'
        claudeFailureDetail = e instanceof Error ? e.message : 'JSON parse error'
        console.error('[analyze] JSON parse error:', e, 'json snippet:', json.slice(0, 400))
      }
    }
  } catch (err) {
    console.error('[analyze] Claude call error:', err)
    claudeFailureReason = 'api_error'
    claudeFailureDetail = err instanceof Error ? err.message : 'Unknown API error'
  }

  // If Claude failed validation, we surface a 400 with the exact zod issues
  // — not a silent fallback. The UI will show "monto: required" instead of
  // "no se pudo interpretar la respuesta".
  if (!mapping) {
    return NextResponse.json(
      {
        error: 'La IA no devolvió un mapping válido del archivo.',
        reason: claudeFailureReason,
        detail: claudeFailureDetail,
        reasoning: claudeReasoning,
      },
      { status: 400 }
    )
  }

  // ── Pick the sheet Claude chose ────────────────────────────────────────────
  let chosen = pickSheet(allSheets, mapping.sheet ?? null)
  if (chosen.name !== allSheets[0].name) {
    warnings.push(`Usando hoja "${chosen.name}" — es la que parece contener las transacciones.`)
  }

  // ── Respect Claude's header_row — re-index rows if it's beyond the heuristic ─
  // Heuristic put the header on row 1 (or failed to detect any). If Claude
  // says "the real header is on row 5", we trust it and rebuild `rows`
  // keyed by those header names BEFORE calling the normalizer.
  const heuristicHeaderRow = chosen.headerRowDetected ? 1 : 0
  if (
    typeof mapping.header_row === 'number' &&
    mapping.header_row > heuristicHeaderRow &&
    mapping.header_row <= chosen.rawMatrix.length
  ) {
    console.log(
      `[import] Re-indexing rows on sheet "${chosen.name}": heuristic said row ${heuristicHeaderRow}, Claude said row ${mapping.header_row}`
    )
    chosen = reindexSheetWithHeaderRow(chosen, mapping.header_row)
    warnings.push(
      `La IA detectó que las cabeceras reales estaban en la fila ${mapping.header_row}, no en la 1. Re-indexamos las filas para usar esas cabeceras.`
    )
  }

  // ── Validate amounts present in mapping ───────────────────────────────────
  const hasMonto = !!mapping.monto || (!!mapping.monto_debito && !!mapping.monto_credito)
  if (!hasMonto) {
    warnings.push(
      'No se detectó una columna de importe clara. Selecciona manualmente cuál es la columna del monto en el preview.'
    )
  }

  // ── Normalize ──────────────────────────────────────────────────────────────
  let transactions: NormalizedTransaction[] = []
  let needsReview: NeedsReviewRow[] = []

  if (hasMonto) {
    const result = normalizeTransactions(chosen.rows, mapping, {
      decimalSeparator: chosen.locale?.decimalSeparator,
    })
    transactions = result.transactions
    needsReview = result.needsReview
  }

  if (transactions.length === 0 && hasMonto) {
    warnings.push(
      'No se encontraron transacciones válidas con el mapeo inferido — los montos podrían no ser numéricos o estar en otra columna.'
    )
  }

  if (needsReview.length > 0) {
    warnings.push(
      `${needsReview.length} fila(s) requieren revisión manual antes de importarse (problemas con monto o fecha).`
    )
  }

  if (!mapping.fecha) {
    warnings.push('No hay columna de fecha — se usará la fecha de hoy para todas las transacciones.')
  }

  // ── Infer categories when not provided ─────────────────────────────────────
  if (!mapping.categoria && transactions.length > 0) {
    try {
      const descriptions = transactions.map((t) => t.description)
      const categories = await inferCategoriesFromDescriptions(descriptions)
      for (let i = 0; i < transactions.length; i++) {
        if (categories[i]) transactions[i].category = categories[i]
      }
      warnings.push('Se infirieron categorías automáticamente a partir de las descripciones.')
    } catch (err) {
      console.error('[analyze] category inference failed:', err)
    }
  }

  const preview = transactions.slice(0, 5)

  return NextResponse.json({
    filename,
    totalRows: chosen.rows.length,
    totalTransactions: transactions.length,
    preview,
    transactions,
    needsReview,
    mapping,
    warnings,
    meta: {
      sheetsCount: allSheets.length,
      chosenSheet: chosen.name,
      rowCounts,
      truncated,
      reasoning: claudeReasoning,
      claudeFailureReason,
    },
  })
}, aiLimiter)
