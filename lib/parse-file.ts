import * as XLSX from 'xlsx'

export type ParsedRow = Record<string, string>

export interface ParsedSheet {
  /** Name of the sheet tab in the workbook */
  name: string
  /** Column names. Synthetic "Columna 1 / 2 / ..." when the file has no header */
  columns: string[]
  /** All rows as keyed records (after the header row is inferred/applied) */
  rows: ParsedRow[]
  /**
   * Raw array-of-arrays of the entire sheet — every cell, every row, including
   * empty cells and pre-header rows. Lets Claude see the file as-is with no
   * structural pre-interpretation from us.
   */
  rawMatrix: string[][]
  /** Number of cells whose formula was resolved on load */
  formulasResolved: number
  /** Whether the sheet had a recognisable header row */
  headerRowDetected: boolean
}

export interface ParsedFile {
  /** First sheet — kept for backward compatibility with existing call sites */
  columns: string[]
  rows: ParsedRow[]
  sheetName: string
  warnings: string[]
  /** All sheets in the workbook (index 0 is the first sheet) */
  sheets: ParsedSheet[]
}

/**
 * Evaluate a simple Excel formula like =F4*G4, =A1+B1, =A1*(1-0.21), =SUM(A1:A5).
 * Returns null if the formula cannot be safely resolved.
 */
function evaluateFormula(
  formula: string,
  resolver: (ref: string) => number
): number | null {
  let expr = formula.trim().replace(/^=/, '').toUpperCase()

  const rangeFn = expr.match(/^(SUM|AVG|AVERAGE)\(([A-Z]+\d+):([A-Z]+\d+)\)$/)
  if (rangeFn) {
    const [, fn, startRef, endRef] = rangeFn
    const colStart = startRef.match(/^([A-Z]+)/)![1]
    const colEnd = endRef.match(/^([A-Z]+)/)![1]
    const rowStart = parseInt(startRef.match(/(\d+)$/)![1], 10)
    const rowEnd = parseInt(endRef.match(/(\d+)$/)![1], 10)
    if (colStart !== colEnd) return null
    const values: number[] = []
    for (let r = rowStart; r <= rowEnd; r++) {
      values.push(resolver(`${colStart}${r}`))
    }
    if (fn === 'SUM') return values.reduce((a, b) => a + b, 0)
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  const adjacent = expr.match(/^([A-Z]+\d+)([A-Z]+\d+)$/)
  if (adjacent) expr = `${adjacent[1]}*${adjacent[2]}`

  expr = expr.replace(/[A-Z]+\d+/g, (ref) => `(${resolver(ref)})`)

  if (!/^[-+*/().\d\s]+$/.test(expr)) return null

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)()
    if (typeof result !== 'number' || !isFinite(result)) return null
    return result
  } catch {
    return null
  }
}

function cellNumericValue(
  sheet: XLSX.WorkSheet,
  ref: string,
  seen: Set<string> = new Set()
): number {
  if (seen.has(ref)) return 0
  seen.add(ref)

  const cell = sheet[ref]
  if (!cell) return 0

  if (typeof cell.v === 'number') return cell.v
  if (typeof cell.v === 'string') {
    const parsed = Number(cell.v.replace(',', '.'))
    if (!isNaN(parsed)) return parsed
  }

  if (typeof cell.f === 'string') {
    const resolved = evaluateFormula(cell.f, (r) => cellNumericValue(sheet, r, seen))
    if (resolved != null) return resolved
  }

  return 0
}

function resolveFormulas(sheet: XLSX.WorkSheet): number {
  let resolved = 0
  for (const ref of Object.keys(sheet)) {
    if (ref.startsWith('!')) continue
    const cell = sheet[ref]
    if (!cell || typeof cell !== 'object') continue

    const hasRawFormulaAsValue =
      typeof cell.v === 'string' && cell.v.startsWith('=')

    if (typeof cell.f === 'string' || hasRawFormulaAsValue) {
      const formula = typeof cell.f === 'string' ? cell.f : (cell.v as string)
      const value = evaluateFormula(formula, (r) => cellNumericValue(sheet, r))
      if (value != null) {
        cell.v = value
        cell.w = String(value)
        cell.t = 'n'
        resolved++
      }
    }
  }
  return resolved
}

function looksLikeHeader(row: Record<string, unknown>): boolean {
  const values = Object.values(row).map((v) => String(v ?? '').trim()).filter(Boolean)
  if (values.length === 0) return false
  const nonNumeric = values.filter((v) => isNaN(Number(v.replace(',', '.')))).length
  return nonNumeric / values.length > 0.5
}

function parseSheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  warnings: string[]
): ParsedSheet {
  const formulasResolved = resolveFormulas(worksheet)
  if (formulasResolved > 0) {
    warnings.push(
      `[${sheetName}] Se calcularon ${formulasResolved} fórmulas leyendo las celdas referenciadas.`
    )
  }

  // Raw matrix — every cell, every row. This is what Claude sees.
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'YYYY-MM-DD',
    header: 1,
  }) as unknown[][]

  const matrix: string[][] = rawMatrix.map((row) =>
    row.map((c) => String(c ?? '').trim())
  )

  // Structured interpretation — try with native headers first.
  let rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'YYYY-MM-DD',
  })

  let headerRowDetected = true
  if (rawRows.length === 0 || !looksLikeHeader(rawRows[0] ?? {})) {
    headerRowDetected = false
    const width = matrix.length > 0 ? Math.max(...matrix.map((r) => r.length)) : 0
    const cols = Array.from({ length: width }, (_, i) => `Columna ${i + 1}`)
    rawRows = matrix.map((r) =>
      Object.fromEntries(cols.map((c, i) => [c, r[i] ?? '']))
    )
    warnings.push(
      `[${sheetName}] Sin cabeceras — se asignaron nombres genéricos (Columna 1, Columna 2, …).`
    )
  }

  const cleanRows: ParsedRow[] = []
  for (const row of rawRows) {
    const entry = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [String(k).trim(), String(v ?? '').trim()])
    )
    const nonEmpty = Object.values(entry).filter((v) => v !== '')
    if (nonEmpty.length === 0) continue
    cleanRows.push(entry)
  }

  const columns = Array.from(
    new Set(cleanRows.flatMap((r) => Object.keys(r)))
  )

  return {
    name: sheetName,
    columns,
    rows: cleanRows,
    rawMatrix: matrix,
    formulasResolved,
    headerRowDetected,
  }
}

export function parseUploadedFile(buffer: Buffer, filename: string): ParsedFile {
  const warnings: string[] = []

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      raw: false,
      dateNF: 'YYYY-MM-DD',
      cellDates: false,
      cellFormula: true,
    })
  } catch (err) {
    throw new Error(
      `No se pudo abrir el archivo: ${err instanceof Error ? err.message : 'formato inválido'}`
    )
  }

  if (!workbook.SheetNames.length) {
    throw new Error('El archivo no contiene hojas.')
  }

  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) =>
    parseSheet(workbook.Sheets[name], name, warnings)
  ).filter((s) => s.rawMatrix.length > 0)

  if (sheets.length === 0) {
    throw new Error('El archivo no contiene filas con datos.')
  }

  // First sheet drives the legacy fields for backward compatibility.
  const first = sheets[0]
  if (first.rows.length === 0) {
    throw new Error('El archivo no contiene filas con datos.')
  }

  return {
    columns: first.columns,
    rows: first.rows,
    sheetName: first.name,
    warnings,
    sheets,
  }
}
