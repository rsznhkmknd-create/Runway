import type { ParsedSheet } from './parse-file'
import type { DetectedRegion } from './parsers/region-detector'

/**
 * Converts a sheet's raw matrix into a compact markdown table.
 * Preserves column positions (A/B/C…) and row numbers so Claude can reason
 * precisely about "header is on row 3" or "column C is the amount".
 */
function matrixToMarkdown(matrix: string[][]): string {
  if (matrix.length === 0) return '_(hoja vacía)_'

  const width = Math.max(...matrix.map((r) => r.length))
  if (width === 0) return '_(hoja vacía)_'

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
      return v.length > 180 ? v.slice(0, 177) + '…' : v
    })
    return [String(i + 1), ...cells].join(' | ')
  })

  return [header.join(' | '), separator.join(' | '), ...bodyLines].join('\n')
}

/** Rough token estimate — Claude's tokenizer averages ~4 chars/token for this kind of text. */
function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4)
}

/**
 * Render every sheet as markdown. Budget is generous — Claude has 200K tokens
 * of context; we reserve ~20K for the prompt + response and send up to 180K of
 * sheet content. Only truncates when a workbook is genuinely huge (tens of
 * thousands of rows); in that case we keep the top + bottom of each sheet so
 * Claude still sees headers and any summary/total rows.
 */
export function renderSheetsForClaude(
  sheets: ParsedSheet[],
  budget = 180_000
): {
  markdown: string
  truncated: boolean
  rowCounts: Record<string, { total: number; shown: number }>
} {
  const rowCounts: Record<string, { total: number; shown: number }> = {}
  let truncated = false
  const parts: string[] = []
  let usedTokens = 0

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s]
    const header = `## Hoja ${s + 1}: "${sheet.name}" — ${sheet.rawMatrix.length} filas totales, cabecera autodetectada: ${sheet.headerRowDetected ? 'sí' : 'no'}`

    let sheetMd = matrixToMarkdown(sheet.rawMatrix)
    let shown = sheet.rawMatrix.length

    // Only truncate if we're genuinely about to blow the budget.
    const projected = usedTokens + estimateTokens(sheetMd) + estimateTokens(header)
    if (projected > budget) {
      // Preserve top (headers, any pre-header metadata) and bottom (totals/footnotes).
      const keepTop = 120
      const keepBottom = 30
      if (sheet.rawMatrix.length > keepTop + keepBottom + 5) {
        const head = sheet.rawMatrix.slice(0, keepTop)
        const tail = sheet.rawMatrix.slice(-keepBottom)
        const gap: string[][] = [
          [
            `… (${sheet.rawMatrix.length - keepTop - keepBottom} filas intermedias omitidas — archivo demasiado grande para el contexto)`,
          ],
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
      if (s + 1 < sheets.length) {
        parts.push(
          `\n_(${sheets.length - s - 1} hoja(s) adicionales omitidas por tamaño)_`
        )
        truncated = true
      }
      break
    }
  }

  return { markdown: parts.join('\n\n'), truncated, rowCounts }
}

// ──────────────────────────────────────────────────────────────────────────────
// System prompt — the brain of the operation.
// ──────────────────────────────────────────────────────────────────────────────

export const ANALYZE_SYSTEM_PROMPT = `Eres un analista financiero experto analizando archivos Excel/CSV subidos por usuarios reales. Tu trabajo es encontrar los datos financieros aunque el archivo sea un desastre.

ESTE ARCHIVO PUEDE ESTAR COMPLETAMENTE DESORDENADO. Prepárate para lo siguiente:

• Los headers pueden estar en CUALQUIER fila — no asumas que están en la fila 1. A menudo están en la fila 3, 5, 7 porque arriba hay un logo ASCII, un título, el nombre de la empresa, el periodo, filas vacías, o metadatos ("Fecha de generación: …").
• Puede haber filas vacías intercaladas, celdas fusionadas representadas como texto repetido, columnas totalmente vacías, columnas con nombres en blanco.
• Puede haber títulos de sección ("Ingresos de Enero") mezclados entre los datos.
• Puede haber subtotales, totales, y fórmulas de suma al final — NO son transacciones, ignóralos.
• Los nombres de columna pueden estar en español, inglés, catalán, portugués, francés, o siglas.
• Las fechas pueden venir en cualquier formato (DD/MM/YYYY, MM-DD-YY, "15 enero 2024", epoch, serial de Excel).
• Los montos pueden tener el símbolo de moneda pegado ("€1.234,56"), con separador de miles como punto o coma, con paréntesis para negativos (contabilidad), o separados en columnas débito/crédito.

TU TAREA: encuentra los datos financieros reales aunque estén escondidos entre basura. Busca patrones: filas consecutivas donde hay al menos una fecha, un monto numérico y (idealmente) una descripción. Ignora filas que sean títulos, subtotales, headers duplicados, metadatos o separadores.

EJEMPLOS DE ARCHIVOS REALES QUE VAS A ENCONTRAR:

1. Extracto bancario español: columnas "Fecha valor", "Concepto", "Debe", "Haber". Headers en fila 1 o 2.
2. Export de Stripe/PayPal en inglés: "Created (UTC)", "Amount", "Currency", "Status", "Customer". Headers en fila 1.
3. Excel casero: filas 1-2 tienen el logo en texto y el nombre del negocio, fila 3 está vacía, fila 4 dice "MES DE ENERO", fila 5 está vacía, fila 6 tiene los headers, fila 7+ los datos, fila final es "TOTAL" con una suma.
4. Libro de caja multi-hoja: cada mes es una pestaña. Puede que te pase solo una hoja o varias — usa la que tenga más datos transaccionales.
5. Export raro sin headers: solo filas de "2024-01-15, Alquiler, -800" — usa "Columna 1", "Columna 2", "Columna 3".
6. Facturación con "Cantidad", "Precio", "IVA", "Total" — el monto real es "Total" (ya lo calculamos nosotros al resolver fórmulas, te llega resuelto).
7. Mezcla caótica: headers en español, valores en inglés, fechas mixtas, montos con "€" pegado, alguna fila en blanco entre bloques.

──────────────────────────────────────────────────────────────────────────────
EJEMPLO DE RAZONAMIENTO ESPERADO (para que veas el nivel de detalle)
──────────────────────────────────────────────────────────────────────────────

Imagina que te paso esto:

## Hoja 1: "Movimientos" — 508 filas
row | A | B | C | D | E
--- | --- | --- | --- | --- | ---
1 | Banco Santander |  |  |  |
2 | Extracto cuenta 0049-**** |  |  |  |
3 | Periodo: Ene-Mar 2024 |  |  |  |
4 |  |  |  |  |
5 | Fecha | Concepto | Debe | Haber | Saldo
6 | 02/01/2024 | Nómina Acme SL |  | 2500,00 | 3420,15
7 | 03/01/2024 | Alquiler oficina | 800,00 |  | 2620,15
...
506 | 31/03/2024 | Pago proveedor | 150,00 |  | 4210,00
507 |  |  |  |  |
508 | TOTAL |  | 12500,00 | 15920,15 |

Tu razonamiento debería ser:
"Las filas 1-3 son metadatos del banco, fila 4 vacía. Los headers reales están en la fila 5 (Fecha, Concepto, Debe, Haber, Saldo). Los datos van de la fila 6 a la 506. La fila 508 es un total que hay que ignorar. Método de tipo: débito/crédito porque hay columnas 'Debe' y 'Haber' separadas. Moneda: EUR (formato español con coma decimal). Confidence: alto — es un extracto bancario estándar."

Y el JSON correspondiente tendría header_row: 5, sheet: "Movimientos", monto_debito: "Debe", monto_credito: "Haber", etc.

──────────────────────────────────────────────────────────────────────────────
CÓMO RESPONDER — DOS BLOQUES, NADA MÁS
──────────────────────────────────────────────────────────────────────────────

1. Un bloque <reasoning> con 3-6 líneas explicando:
   - Qué hoja eliges y por qué
   - En qué fila están los headers reales
   - Qué filas son basura (metadatos/títulos/totales) y se ignoran
   - Qué método de tipo usas y por qué

2. Un bloque <json> con JSON válido. Sin markdown, sin backticks, sin comentarios, sin trailing commas. Exactamente esta forma:

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
- Usa EXACTAMENTE el nombre de columna tal como aparece en la fila de headers que detectaste. Si no hay headers reales, usa "Columna 1", "Columna 2", etc.
- Si no hay columna de fecha, pon "fecha": null.
- Si no hay categoría, pon "categoria": null.
- Si hay débito/crédito separados (Debe/Haber, pagos/cobros, debit/credit), usa monto_debito + monto_credito con tipo_metodo "debito_credito" y deja "monto": null.
- Si el signo indica el tipo, usa "signo_positivo_es_ingreso" o "signo_positivo_es_gasto".
- "header_row" es el número de fila (1-indexed, el que ves en la columna "row" de la tabla markdown) donde están los headers reales.
- "sheet" es el nombre de la hoja (tab) elegida, tal como aparece en el título "Hoja N: ...".
- per_column_confidence: "alto" si está clarísimo, "medio" si hay ambigüedad, "bajo" si adivinaste, null si el campo no aplica.
- SIEMPRE devuelve un JSON válido. Nunca un error. Si no estás seguro, devuelve tu mejor inferencia con confidence "bajo" — el usuario corregirá en el preview.`

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
    .map(
      (s, i) =>
        `  ${i + 1}. "${s.name}" — ${s.rawMatrix.length} filas × ${Math.max(
          ...s.rawMatrix.map((r) => r.length),
          0
        )} columnas${s.headerRowDetected ? '' : ' (sin cabecera autodetectada)'}`
    )
    .join('\n')

  const truncNote = truncated
    ? '\n\n⚠️ NOTA: El archivo es enorme y hemos tenido que recortar algunas filas intermedias — verás marcadores "… (N filas intermedias omitidas)". Las filas visibles (top + bottom) son suficientes para detectar la estructura.'
    : ''

  return `ARCHIVO: ${filename}

HOJAS DETECTADAS (${sheets.length}):
${sheetSummary}${truncNote}

CONTENIDO COMPLETO DEL ARCHIVO — cada hoja como tabla markdown. La columna "row" indica el número de fila original. Las letras A/B/C… son las columnas del Excel.

${markdown}

Analiza el archivo como te indica el system prompt. Empieza por <reasoning>…</reasoning> con tu razonamiento, sigue con <json>…</json> con el mapping exacto.`
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

  // Fallback — locate the first balanced-ish JSON blob.
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

// ──────────────────────────────────────────────────────────────────────────────
// Multi-region rendering — used when the detector finds 2+ regions in a sheet.
// ──────────────────────────────────────────────────────────────────────────────

/** Convert a DetectedRegion's rawMatrix into the same markdown table shape used
 *  for full sheets, so Claude can apply the same column-detection logic. */
function regionToMarkdown(region: DetectedRegion): string {
  const matrix = region.rawMatrix.map((row) =>
    row.map((c) => (c == null ? '' : String(c)))
  )
  return matrixToMarkdown(matrix)
}

export function renderRegionsForClaude(
  sheets: ParsedSheet[],
  regionsBySheet: Map<string, DetectedRegion[]>,
  budget = 180_000
): { markdown: string; truncated: boolean } {
  let truncated = false
  const parts: string[] = []
  let usedTokens = 0

  for (const sheet of sheets) {
    const regions = regionsBySheet.get(sheet.name) ?? []
    if (regions.length === 0) continue
    parts.push(`# Hoja: "${sheet.name}" (${regions.length} regiones detectadas)`)
    for (const r of regions) {
      const header =
        `\n## Region "${r.id}"  (filas ${r.startRow}-${r.endRow}, ` +
        `cols ${r.startCol}-${r.endCol})` +
        (r.sectionTitle ? `  — sectionTitle: "${r.sectionTitle}"` : '')
      const md = regionToMarkdown(r)
      const cost = estimateTokens(header) + estimateTokens(md)
      if (usedTokens + cost > budget) {
        parts.push(
          `\n_(Restantes regiones omitidas por presupuesto de tokens)_`
        )
        truncated = true
        break
      }
      parts.push(`${header}\n\n${md}`)
      usedTokens += cost
    }
    if (truncated) break
  }

  return { markdown: parts.join('\n\n'), truncated }
}

/**
 * Addendum appended to the system prompt when running in multi-region mode.
 * Stays short on purpose — does NOT redo the prompt, just adds the rules
 * specific to the regions/blockType payload.
 */
export const MULTIREGION_PROMPT_ADDENDUM = `

──────────────────────────────────────────────────────────────────────────────
MULTI-REGIÓN
──────────────────────────────────────────────────────────────────────────────

Si el archivo tiene múltiples tablas separadas por filas o columnas vacías, recibirás cada una como región independiente con su sectionTitle. Devuelve un mapping por región en el array \`regions\`. Cada región tiene su propio header_row (relativo al inicio de la región, 1-indexed dentro del rawMatrix de la región). Clasifica cada región con blockType.

Clasificación de blockType:
- inventory_snapshot: tiene "Producto", "Cantidad", "Precio unit" → NO son transacciones, no extraer
- summary_totals: filas como "Total ventas", "Ganancia??" → NO extraer
- recurring_expenses: tiene columna "Frecuencia" (mensual, quincenal, bimestral) y a veces no tiene fecha específica
- accounts_receivable: deudas de clientes al negocio (columna "Quien debe", "Status")
- loans_payable: préstamos del negocio (columna "Pago mensual", "Monto original")
- income_transactions: ventas, ingresos (fecha + monto positivo)
- expense_transactions: gastos con fecha específica
- notes_other: comentarios, pendientes
- unknown: cuando no puedes decidir

FORMATO DE RESPUESTA EN MULTI-REGIÓN:

<reasoning> 2-4 líneas describiendo qué encontraste por región </reasoning>
<json>
{
  "regions": [
    {
      "regionId": "<id de la región tal como te llegó>",
      "blockType": "<uno de los 9 valores>",
      "mapping": {
        ...mismos campos que el JSON de single-region...
        "blockType": "<repite el blockType aquí>"
      }
    }
  ]
}
</json>

Para regiones que NO contienen transacciones (inventory_snapshot, summary_totals, notes_other, unknown), igual debes incluir el blockType pero el mapping puede tener campos null — no se intentará normalizar.`

/** Clean a JSON string before parsing: strip BOM, markdown fences, trailing commas. */
export function cleanJson(json: string): string {
  return json
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .trim()
}
