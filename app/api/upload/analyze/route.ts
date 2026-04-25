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
  type ColumnMapping,
  type NormalizedTransaction,
  type NeedsReviewRow,
} from '@/lib/normalize-transactions'
import {
  ColumnMappingSchema,
  formatZodIssues,
} from '@/lib/schemas/import'
import { inferCategoriesFromDescriptions } from '@/lib/infer-categories'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'
import {
  ANALYZE_SYSTEM_PROMPT,
  buildAnalyzeUserPrompt,
  cleanJson,
  extractReasoningAndJson,
  renderSheetsForClaude,
} from '@/lib/analyze-excel-prompt'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods']
const MAX_SIZE = 10 * 1024 * 1024

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
    const result = normalizeTransactions(chosen.rows, mapping)
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
