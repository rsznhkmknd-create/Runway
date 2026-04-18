import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { anthropic } from '@/lib/claude'
import { parseUploadedFile } from '@/lib/parse-file'
import type { ColumnMapping } from '@/lib/normalize-transactions'

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/csv',
  'application/vnd.oasis.opendocument.spreadsheet', // ods
  'application/octet-stream', // fallback
]

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods']

const SYSTEM_PROMPT = `Eres un experto en análisis de datos financieros. Tu tarea es analizar columnas y datos de muestra de archivos financieros (hojas de cálculo o CSV) e identificar qué columna corresponde a cada campo del sistema.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. Sin explicaciones, sin markdown, sin texto adicional.`

function buildUserPrompt(columns: string[], sampleRows: Record<string, string>[]): string {
  return `Analiza estas columnas y datos de un archivo financiero. Identifica qué columna contiene cada dato.

COLUMNAS DISPONIBLES:
${JSON.stringify(columns)}

PRIMERAS ${sampleRows.length} FILAS DE DATOS:
${JSON.stringify(sampleRows, null, 2)}

Responde SOLO con este JSON exacto (sin markdown, sin texto extra):
{
  "fecha": "nombre_columna_exacto_o_null",
  "concepto": "nombre_columna_exacto_o_null",
  "monto": "nombre_columna_si_hay_una_sola_columna_de_importe_o_null",
  "monto_debito": "nombre_columna_de_debitos_o_pagos_o_null",
  "monto_credito": "nombre_columna_de_creditos_o_cobros_o_null",
  "tipo": "nombre_columna_explicita_de_tipo_o_null",
  "tipo_metodo": "columna_explicita|signo_positivo_es_ingreso|signo_positivo_es_gasto|debito_credito",
  "tipo_valores_ingreso": ["lista de valores del tipo que significan ingreso, cobro, etc."],
  "tipo_valores_gasto": ["lista de valores del tipo que significan gasto, pago, etc."],
  "categoria": "nombre_columna_exacto_o_null",
  "confidence": "alto|medio|bajo",
  "moneda_detectada": "EUR|MXN|USD|COP|ARS|desconocida",
  "notas": "observaciones breves sobre el archivo"
}

REGLAS:
- Usa EXACTAMENTE el nombre de la columna tal como aparece en la lista
- Si hay columnas separadas para débito/crédito (debe/haber, pagos/cobros), usa monto_debito y monto_credito, pon monto como null y tipo_metodo como "debito_credito"
- Si el tipo se detecta por el signo del monto (positivo/negativo), tipo es null
- Si hay una columna explícita con valores como "ingreso/gasto", "C/P", "cobro/pago", usa tipo con tipo_metodo "columna_explicita"
- confidence "bajo" si hay datos inconsistentes o columnas ambiguas
- tipo_valores_ingreso y tipo_valores_gasto deben incluir todas las variantes posibles que encuentres en los datos`
}

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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

  // Validate extension
  const filename = file.name.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext))
  if (!hasValidExt) {
    return NextResponse.json(
      { error: `Formato no soportado. Acepta: ${ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 })
  }

  let parsed
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    parsed = parseUploadedFile(buffer, file.name)
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo leer el archivo: ${err instanceof Error ? err.message : 'formato inválido'}` },
      { status: 422 }
    )
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: 'El archivo está vacío o no contiene datos' }, { status: 422 })
  }

  if (parsed.columns.length < 2) {
    return NextResponse.json(
      { error: 'El archivo no tiene suficientes columnas para reconocer datos financieros' },
      { status: 422 }
    )
  }

  // Send up to 15 sample rows to Claude for analysis
  const sampleRows = parsed.rows.slice(0, 15)

  let mapping: ColumnMapping
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(parsed.columns, sampleRows),
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    // Strip potential markdown fences
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    mapping = JSON.parse(jsonStr) as ColumnMapping
  } catch (err) {
    console.error('Claude analysis error:', err)
    return NextResponse.json(
      { error: 'No se pudo analizar el archivo automáticamente. Por favor verifica que contiene datos financieros.' },
      { status: 422 }
    )
  }

  // Validate that Claude found at least fecha + monto (or debit/credit)
  const hasFecha = !!mapping.fecha
  const hasMonto =
    !!mapping.monto || (!!mapping.monto_debito && !!mapping.monto_credito)

  if (!hasFecha || !hasMonto) {
    return NextResponse.json(
      {
        error:
          'No se detectaron columnas de fecha e importe en el archivo. Verifica que el archivo contiene transacciones financieras.',
      },
      { status: 422 }
    )
  }

  return NextResponse.json({
    mapping,
    columns: parsed.columns,
    sampleRows,
    allRows: parsed.rows,
    totalRows: parsed.rows.length,
    filename: file.name,
  })
}
