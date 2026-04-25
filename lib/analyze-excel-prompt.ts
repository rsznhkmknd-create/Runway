import type { ParsedSheet } from './parse-file'

/**
 * Converts a sheet's raw matrix into a compact markdown table.
 * Preserves column positions so Claude can reason about "column C" etc.
 * Escapes pipe chars so the markdown doesn't break.
 */
function matrixToMarkdown(matrix: string[][]): string {
  if (matrix.length === 0) return '_(hoja vacía)_'

  const width = Math.max(...matrix.map((r) => r.length))
  if (width === 0) return '_(hoja vacía)_'

  // Column letters: A, B, ..., Z, AA, ...
  const colLetter = (i: number): string => {
    let s = ''
    let n = i
    do {
      s = String.fromCharCode(65 + (n % 26)) + s
      n = Math.floor(n / 26) - 1
    } while (n >= 0)
    return s
  }

  const header = ['row', ...Array.from({ length: width }, (_, i) => colLetter(i))]
  const separator = header.map(() => '---')

  const bodyLines = matrix.map((row, i) => {
    const cells = Array.from({ length: width }, (_, c) => {
      const v = (row[c] ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      return v.length > 120 ? v.slice(0, 117) + '…' : v
    })
    return [String(i + 1), ...cells].join(' | ')
  })

  return [header.join(' | '), separator.join(' | '), ...bodyLines].join('\n')
}

/**
 * Estimate token cost of a sheet's markdown representation.
 * Uses ~4 chars/token as a conservative heuristic.
 */
function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4)
}

/**
 * Render every sheet as markdown, but cap total tokens so we stay well under
 * Claude's 200K context. If a sheet is huge we truncate its body but keep
 * top/bottom so Claude still sees the real edges.
 */
export function renderSheetsForClaude(
  sheets: ParsedSheet[],
  /** rough token budget for all sheet content combined */
  budget = 120_000
): { markdown: string; truncated: boolean; rowCounts: Record<string, { total: number; shown: number }> } {
  const rowCounts: Record<string, { total: number; shown: number }> = {}
  let truncated = false
  const parts: string[] = []
  let usedTokens = 0

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s]
    const header = `## Hoja ${s + 1}: "${sheet.name}" (${sheet.rawMatrix.length} filas totales, cabecera detectada: ${sheet.headerRowDetected ? 'sí' : 'no'})`

    // Start optimistic — try to include the entire sheet
    let sheetMd = matrixToMarkdown(sheet.rawMatrix)
    let shown = sheet.rawMatrix.length

    // If too big, keep top 80 + bottom 20 rows (preserves headers + totals)
    if (estimateTokens(sheetMd) + usedTokens > budget) {
      const keepTop = 80
      const keepBottom = 20
      if (sheet.rawMatrix.length > keepTop + keepBottom + 5) {
        const head = sheet.rawMatrix.slice(0, keepTop)
        const tail = sheet.rawMatrix.slice(-keepBottom)
        const gap = [
          [`… (${sheet.rawMatrix.length - keepTop - keepBottom} filas intermedias omitidas por tamaño)`],
        ]
        sheetMd = matrixToMarkdown([...head, ...gap, ...tail])
        shown = keepTop + keepBottom
        truncated = true
      }
    }

    rowCounts[sheet.name] = { total: sheet.rawMatrix.length, shown }
    parts.push(`${header}\n\n${sheetMd}`)
    usedTokens += estimateTokens(sheetMd) + estimateTokens(header)

    if (usedTokens >= budget) {
      parts.push(
        `\n_(Resto de hojas omitidas por tamaño — ${sheets.length - s - 1} hoja(s) no se enviaron)_`
      )
      truncated = true
      break
    }
  }

  return { markdown: parts.join('\n\n'), truncated, rowCounts }
}

export const ANALYZE_SYSTEM_PROMPT = `Eres un analista financiero experto. Te estoy pasando un archivo Excel completo. Tu trabajo es entenderlo como lo haría un humano inteligente — sin importar si está desordenado, tiene fórmulas, múltiples hojas, headers en cualquier fila, datos en cualquier idioma o formato.

Encuentra las columnas de fecha, descripción, monto y tipo (ingreso/gasto). Razona sobre el contenido, no apliques reglas rígidas. Si el monto está calculado como cantidad × precio, considera que ya está resuelto (te lo pasamos evaluado). Si el tipo no está explícito, infierelo del contexto.

EJEMPLOS DE ARCHIVOS QUE PUEDES ENCONTRAR:
• Extracto bancario español con columnas "Fecha valor", "Concepto", "Debe" / "Haber".
• Export de Stripe en inglés con "Created (UTC)", "Amount", "Currency", "Status".
• Excel casero con headers en la fila 3 porque las filas 1-2 tienen un logo y un título.
• Libro de caja en el que cada mes es una hoja distinta y cada hoja tiene su propia tabla.
• Archivo de una asesoría con signo negativo para gastos y positivo para ingresos, sin columna de tipo.
• CSV sin cabeceras — solo fila tras fila de "2024-01-15, Alquiler, -800".
• Facturación con columnas "Cantidad", "Precio", "IVA", "Total" — el monto real está en "Total".
• Mezcla caótica: headers en español y valores en inglés, fechas en formatos mixtos, montos con "€" pegado.

CÓMO RESPONDER — DOS BLOQUES, NADA MÁS:

1. Primero, un bloque <reasoning> con 2-4 líneas explicando qué estructura detectaste y por qué. Es para tu razonamiento, no para el usuario final.

2. Luego, un bloque <json> con JSON válido (sin markdown, sin backticks, sin comentarios, sin trailing commas). Ese JSON DEBE tener esta forma exacta:

{
  "fecha": "nombre_columna_o_null",
  "concepto": "nombre_columna_o_null",
  "monto": "nombre_columna_de_importe_único_o_null",
  "monto_debito": "nombre_columna_o_null",
  "monto_credito": "nombre_columna_o_null",
  "tipo": "nombre_columna_explícita_o_null",
  "tipo_metodo": "columna_explicita|signo_positivo_es_ingreso|signo_positivo_es_gasto|debito_credito|descripcion_keywords",
  "tipo_valores_ingreso": ["valores que significan ingreso"],
  "tipo_valores_gasto": ["valores que significan gasto"],
  "categoria": "nombre_columna_categoría_o_null",
  "sheet": "nombre_de_la_hoja_a_usar",
  "header_row": 1,
  "confidence": "alto|medio|bajo",
  "per_column_confidence": {
    "fecha": "alto|medio|bajo|null",
    "concepto": "alto|medio|bajo|null",
    "monto": "alto|medio|bajo|null",
    "tipo": "alto|medio|bajo|null",
    "categoria": "alto|medio|bajo|null"
  },
  "moneda_detectada": "EUR|MXN|USD|COP|ARS|CLP|GBP|desconocida",
  "notas": "una frase breve sobre el archivo"
}

REGLAS PARA EL JSON:
- Usa EXACTAMENTE el nombre de columna tal como aparece en la cabecera detectada. Si no hay cabecera real, usa "Columna N" donde N empieza en 1.
- Si no hay columna de fecha, pon "fecha": null — se usará la fecha de importación.
- Si no hay categoría, pon "categoria": null — se inferirá después.
- Si hay débito/crédito separados (debe/haber, pagos/cobros, debit/credit), usa monto_debito + monto_credito con tipo_metodo "debito_credito" y deja "monto": null.
- Si el signo del monto indica el tipo, usa "signo_positivo_es_ingreso" o "signo_positivo_es_gasto".
- Si no hay señal clara pero hay descripción, usa "descripcion_keywords".
- "header_row" es el número de fila (1-indexed) donde viven los nombres reales. Es 1 en un archivo normal, puede ser 3-4 si hay metadatos arriba.
- Para "per_column_confidence": usa "alto" si estás seguro, "medio" si hay ambigüedad razonable, "bajo" si adivinaste, null si ese campo no aplica.
- SIEMPRE devuelve un JSON válido aunque te falte información. Nunca devuelvas un error — devuelve tu mejor inferencia con confidence "bajo" y el usuario corregirá en el preview.`

export type AnalyzeUserPromptInput = {
  filename: string
  sheets: ParsedSheet[]
  markdown: string
  truncated: boolean
}

export function buildAnalyzeUserPrompt({
  filename,
  sheets,
  markdown,
  truncated,
}: AnalyzeUserPromptInput): string {
  const sheetSummary = sheets
    .map((s, i) => `  ${i + 1}. "${s.name}" — ${s.rawMatrix.length} filas × ${Math.max(...s.rawMatrix.map((r) => r.length), 0)} columnas${s.headerRowDetected ? '' : ' (sin cabecera detectada)'}`)
    .join('\n')

  const truncNote = truncated
    ? '\n\nNOTA: El archivo era muy grande y hemos tenido que truncar algunas filas intermedias — verás marcadores "… (N filas intermedias omitidas)" en la tabla. Tu tarea es inferir la estructura; las filas omitidas no son necesarias para detectar columnas.'
    : ''

  return `ARCHIVO: ${filename}

HOJAS (${sheets.length}):
${sheetSummary}${truncNote}

CONTENIDO COMPLETO (cada hoja como tabla markdown, la columna "row" es el número de fila original del archivo):

${markdown}

Analiza esto como te indica el system prompt. Empieza por <reasoning>…</reasoning>, sigue con <json>…</json>.`
}

/** Extract the <reasoning> block (if any) and the <json> block from Claude's response. */
export function extractReasoningAndJson(raw: string): { reasoning: string; json: string } {
  const reasoningMatch = raw.match(/<reasoning>([\s\S]*?)<\/reasoning>/i)
  const jsonMatch = raw.match(/<json>([\s\S]*?)<\/json>/i)

  if (jsonMatch) {
    return {
      reasoning: reasoningMatch?.[1]?.trim() ?? '',
      json: jsonMatch[1].trim(),
    }
  }

  // Fallback — some responses may skip the tags. Try to locate the JSON blob.
  const braceStart = raw.indexOf('{')
  const braceEnd = raw.lastIndexOf('}')
  if (braceStart >= 0 && braceEnd > braceStart) {
    return {
      reasoning: reasoningMatch?.[1]?.trim() ?? '',
      json: raw.slice(braceStart, braceEnd + 1).trim(),
    }
  }

  return { reasoning: reasoningMatch?.[1]?.trim() ?? '', json: '' }
}

/**
 * Clean a JSON string before parsing: strip markdown fences, trailing commas,
 * BOM etc. Matches the behaviour of the previous route.
 */
export function cleanJson(json: string): string {
  return json
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .trim()
}
