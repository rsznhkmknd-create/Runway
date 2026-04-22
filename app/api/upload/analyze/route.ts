import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { anthropic } from '@/lib/claude'
import { parseUploadedFile } from '@/lib/parse-file'
import {
  normalizeTransactions,
  type ColumnMapping,
  type NormalizedTransaction,
} from '@/lib/normalize-transactions'
import { inferCategoriesFromDescriptions } from '@/lib/infer-categories'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods']
const MAX_SIZE = 10 * 1024 * 1024

const SYSTEM_PROMPT = `Eres un experto en análisis de datos financieros. Analizas archivos Excel/CSV con transacciones bancarias o contables y detectas la estructura independientemente de cómo estén nombradas las columnas (español, inglés, siglas, sin encabezado) o en qué orden aparezcan.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. Sin explicaciones, sin markdown.`

function buildUserPrompt(columns: string[], sampleRows: Record<string, string>[]): string {
  return `Analiza este archivo financiero y devuelve el mapeo de columnas.

COLUMNAS (pueden ser genéricas tipo "Columna 1" si el archivo no tenía cabeceras):
${JSON.stringify(columns)}

PRIMERAS ${sampleRows.length} FILAS:
${JSON.stringify(sampleRows, null, 2)}

Responde SOLO con este JSON (sin markdown):
{
  "fecha": "nombre_columna_o_null_si_no_existe",
  "concepto": "nombre_columna_de_descripción_o_null",
  "monto": "nombre_columna_de_importe_único_o_null",
  "monto_debito": "nombre_columna_de_débitos_o_null",
  "monto_credito": "nombre_columna_de_créditos_o_null",
  "tipo": "nombre_columna_explícita_de_tipo_o_null",
  "tipo_metodo": "columna_explicita|signo_positivo_es_ingreso|signo_positivo_es_gasto|debito_credito|descripcion_keywords",
  "tipo_valores_ingreso": ["valores del tipo que significan ingreso"],
  "tipo_valores_gasto": ["valores del tipo que significan gasto"],
  "categoria": "nombre_columna_categoría_o_null",
  "confidence": "alto|medio|bajo",
  "moneda_detectada": "EUR|MXN|USD|COP|ARS|CLP|GBP|desconocida",
  "notas": "una frase breve sobre el archivo"
}

REGLAS:
- Usa EXACTAMENTE el nombre de columna tal como aparece en la lista.
- Si no hay columna de fecha, pon "fecha": null. Se usará la fecha de importación.
- Si no hay categoría, pon "categoria": null. Se inferirá después.
- Si hay débito/crédito separados (debe/haber, pagos/cobros), usa monto_debito + monto_credito con tipo_metodo "debito_credito".
- Si el signo del monto indica el tipo, usa "signo_positivo_es_ingreso" o "signo_positivo_es_gasto".
- Si no se detecta un método claro pero hay descripción, usa "descripcion_keywords".
- Acepta nombres en ESPAÑOL (fecha, importe, concepto, debe, haber, cargo, abono) e INGLÉS (date, amount, description, debit, credit, category).
- El archivo es VÁLIDO si existe una columna de monto o un par débito/crédito. La fecha es opcional.`
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: 'El archivo no contiene filas con datos.' },
      { status: 422 }
    )
  }

  // ── Ask Claude to identify the structure ───────────────────────────────────
  const sampleRows = parsed.rows.slice(0, 15)
  const userPrompt = buildUserPrompt(parsed.columns, sampleRows)

  let mapping: ColumnMapping
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    mapping = JSON.parse(jsonStr) as ColumnMapping
  } catch (err) {
    console.error('[analyze] Claude error:', err)
    return NextResponse.json(
      { error: 'No se pudo analizar el archivo. Inténtalo de nuevo en un momento.' },
      { status: 422 }
    )
  }

  // ── Validate that we can extract amounts ───────────────────────────────────
  const hasMonto = !!mapping.monto || (!!mapping.monto_debito && !!mapping.monto_credito)
  if (!hasMonto) {
    return NextResponse.json(
      {
        error:
          'Este archivo no parece contener datos financieros. No se detectó ninguna columna de importe.',
      },
      { status: 422 }
    )
  }

  // ── Normalize every row ────────────────────────────────────────────────────
  const transactions: NormalizedTransaction[] = normalizeTransactions(parsed.rows, mapping)

  if (transactions.length === 0) {
    return NextResponse.json(
      {
        error:
          'No se encontraron transacciones válidas en el archivo. Verifica que los montos son numéricos.',
      },
      { status: 422 }
    )
  }

  const warnings = [...parsed.warnings]
  if (!mapping.fecha) {
    warnings.push('El archivo no tenía columna de fecha — se usó la fecha de hoy para todas las transacciones.')
  }

  // ── If no category column, infer via Claude from descriptions ──────────────
  if (!mapping.categoria) {
    try {
      const descriptions = transactions.map((t) => t.description)
      const categories = await inferCategoriesFromDescriptions(descriptions)
      for (let i = 0; i < transactions.length; i++) {
        if (categories[i]) transactions[i].category = categories[i]
      }
      warnings.push('Se infirieron categorías automáticamente a partir de las descripciones.')
    } catch (err) {
      console.error('[analyze] category inference failed:', err)
      // keep 'Sin categoría' default
    }
  }

  const preview = transactions.slice(0, 5)

  return NextResponse.json({
    filename: file.name,
    totalRows: parsed.rows.length,
    totalTransactions: transactions.length,
    preview,
    transactions,
    mapping,
    warnings,
  })
}
