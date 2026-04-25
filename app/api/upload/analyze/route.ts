import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { anthropic } from '@/lib/claude'
import { parseUploadedFile, type ParsedSheet } from '@/lib/parse-file'
import {
  normalizeTransactions,
  type ColumnMapping,
  type NormalizedTransaction,
  type PerColumnConfidence,
} from '@/lib/normalize-transactions'
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

// ── Fallback mapping so we never return a hard failure from the route ────────
function bestEffortFallbackMapping(sheet: ParsedSheet): ColumnMapping {
  const cols = sheet.columns
  const find = (patterns: RegExp[]) =>
    cols.find((c) => patterns.some((p) => p.test(c.toLowerCase()))) ?? null

  const monto = find([/\bmonto\b/, /\bimporte\b/, /\btotal\b/, /\bamount\b/])
  const fecha = find([/fecha/, /\bdate\b/])
  const concepto = find([/concepto|descripci|detalle|description|memo|referencia/])
  const debito = find([/\bdebe\b|\bdebito\b|\bdébito\b|\bdebit\b|\bcargo\b|\bpago\b/])
  const credito = find([/\bhaber\b|\bcredito\b|\bcrédito\b|\bcredit\b|\babono\b|\bingreso\b/])

  return {
    fecha,
    concepto,
    monto: monto ?? null,
    monto_debito: debito,
    monto_credito: credito,
    tipo: null,
    tipo_metodo: debito && credito ? 'debito_credito' : 'descripcion_keywords',
    tipo_valores_ingreso: [],
    tipo_valores_gasto: [],
    categoria: null,
    confidence: 'bajo',
    moneda_detectada: 'desconocida',
    notas: 'Fallback automático: Claude no respondió con un mapping válido. Revisa y ajusta antes de importar.',
    sheet: sheet.name,
    header_row: 1,
    per_column_confidence: {
      fecha: fecha ? 'bajo' : null,
      concepto: concepto ? 'bajo' : null,
      monto: monto || (debito && credito) ? 'bajo' : null,
      tipo: null,
      categoria: null,
    },
    reasoning: '',
  }
}

// Coerce whatever Claude returned into a strict ColumnMapping, filling defaults.
function coerceMapping(raw: unknown, fallback: ColumnMapping): ColumnMapping {
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Record<string, unknown>

  const str = (k: string): string | null => {
    const v = r[k]
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    return s === '' || s.toLowerCase() === 'null' ? null : s
  }

  const arr = (k: string): string[] => {
    const v = r[k]
    if (Array.isArray(v)) return v.map((x) => String(x))
    return []
  }

  const metodoRaw = str('tipo_metodo') ?? ''
  const metodo = (
    [
      'columna_explicita',
      'signo_positivo_es_ingreso',
      'signo_positivo_es_gasto',
      'debito_credito',
      'descripcion_keywords',
    ].includes(metodoRaw)
      ? metodoRaw
      : 'descripcion_keywords'
  ) as ColumnMapping['tipo_metodo']

  const confRaw = str('confidence') ?? ''
  const conf = (['alto', 'medio', 'bajo'].includes(confRaw) ? confRaw : 'bajo') as ColumnMapping['confidence']

  const pcc = r.per_column_confidence
  let per_column_confidence: PerColumnConfidence | undefined
  if (pcc && typeof pcc === 'object') {
    const p = pcc as Record<string, unknown>
    const coerce = (v: unknown): 'alto' | 'medio' | 'bajo' | null => {
      const s = v === null || v === undefined ? '' : String(v)
      return s === 'alto' || s === 'medio' || s === 'bajo' ? s : null
    }
    per_column_confidence = {
      fecha: coerce(p.fecha),
      concepto: coerce(p.concepto),
      monto: coerce(p.monto),
      tipo: coerce(p.tipo),
      categoria: coerce(p.categoria),
    }
  }

  const headerRowNum = typeof r.header_row === 'number' ? r.header_row : 1

  return {
    fecha: str('fecha'),
    concepto: str('concepto'),
    monto: str('monto'),
    monto_debito: str('monto_debito'),
    monto_credito: str('monto_credito'),
    tipo: str('tipo'),
    tipo_metodo: metodo,
    tipo_valores_ingreso: arr('tipo_valores_ingreso'),
    tipo_valores_gasto: arr('tipo_valores_gasto'),
    categoria: str('categoria'),
    confidence: conf,
    moneda_detectada: str('moneda_detectada') ?? 'desconocida',
    notas: str('notas') ?? '',
    sheet: str('sheet') ?? fallback.sheet ?? null,
    header_row: headerRowNum,
    per_column_confidence,
  }
}

function pickSheet(sheets: ParsedSheet[], mappingSheet: string | null | undefined): ParsedSheet {
  if (mappingSheet) {
    const match = sheets.find((s) => s.name.trim().toLowerCase() === mappingSheet.trim().toLowerCase())
    if (match && match.rows.length > 0) return match
  }
  // Pick the sheet with the most rows (most likely the data sheet)
  const byRows = [...sheets].sort((a, b) => b.rows.length - a.rows.length)
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

  const filename = file.name.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext))
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
    parsed = parseUploadedFile(buffer, file.name)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Formato inválido' },
      { status: 422 }
    )
  }

  const allSheets = parsed.sheets
  const warnings = [...parsed.warnings]

  if (allSheets.length === 0 || allSheets.every((s) => s.rows.length === 0)) {
    return NextResponse.json(
      { error: 'El archivo no contiene filas con datos.' },
      { status: 422 }
    )
  }

  // ── Render full content for Claude ─────────────────────────────────────────
  const { markdown, truncated, rowCounts } = renderSheetsForClaude(allSheets)
  if (truncated) {
    warnings.push(
      'El archivo era muy grande; enviamos una parte representativa a la IA para detectar estructura (los datos completos sí se procesan después).'
    )
  }

  const userPrompt = buildAnalyzeUserPrompt({
    filename: file.name,
    sheets: allSheets,
    markdown,
    truncated,
  })

  // ── Call Claude (chain-of-thought, 4096 tokens) ────────────────────────────
  const defaultFallback = bestEffortFallbackMapping(allSheets[0])
  let mapping: ColumnMapping = defaultFallback
  let claudeReasoning = ''
  let claudeFailureReason: string | null = null

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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
    } else {
      try {
        const parsedJson = JSON.parse(cleanJson(json))
        mapping = coerceMapping(parsedJson, defaultFallback)
        mapping.reasoning = reasoning
      } catch (e) {
        console.error('[analyze] JSON parse error:', e, 'json snippet:', json.slice(0, 400))
        claudeFailureReason = 'invalid_json'
      }
    }
  } catch (err) {
    console.error('[analyze] Claude call error:', err)
    claudeFailureReason = 'api_error'
  }

  if (claudeFailureReason) {
    warnings.push(
      'La IA no pudo razonar sobre el archivo por completo — usamos un mapeo automático por patrones. Revisa y ajusta las columnas en el preview antes de importar.'
    )
  }

  // ── Pick the sheet Claude chose (or the best default) ──────────────────────
  const chosen = pickSheet(allSheets, mapping.sheet ?? null)
  if (chosen.name !== allSheets[0].name) {
    warnings.push(`Usando hoja "${chosen.name}" — es la que parece contener las transacciones.`)
  }

  // ── Validate that we can extract amounts ───────────────────────────────────
  const hasMonto = !!mapping.monto || (!!mapping.monto_debito && !!mapping.monto_credito)
  if (!hasMonto) {
    // Even without a clear amount column we still return — with a warning —
    // so the user can correct in the preview rather than hit a dead-end error.
    warnings.push(
      'No se detectó una columna de importe clara. Selecciona manualmente cuál es la columna del monto en el preview.'
    )
  }

  // ── Normalize ──────────────────────────────────────────────────────────────
  const transactions: NormalizedTransaction[] = hasMonto
    ? normalizeTransactions(chosen.rows, mapping)
    : []

  if (transactions.length === 0 && hasMonto) {
    warnings.push(
      'No se encontraron transacciones válidas con el mapeo inferido — los montos podrían no ser numéricos o estar en otra columna.'
    )
  }

  if (!mapping.fecha) {
    warnings.push('No hay columna de fecha — se usó la fecha de hoy para todas las transacciones.')
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
    filename: file.name,
    totalRows: chosen.rows.length,
    totalTransactions: transactions.length,
    preview,
    transactions,
    mapping,
    warnings,
    /** Extra metadata to power a richer preview UI */
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
