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
  /**
   * File-locale signal. Detected by counting LATAM ("1.234,56") vs US
   * ("1,234.56") number patterns across the rawMatrix. Used by parseAmount
   * to disambiguate single-separator strings.
   */
  locale: { decimalSeparator: ',' | '.' | 'unknown' }
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

/** Looks-like-a-date heuristic — DD/MM/YYYY, ISO, or short Spanish months. */
function cellLooksLikeDate(s: string): boolean {
  const v = s.trim()
  if (!v) return false
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(v)) return true
  if (/^\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(v)) return true
  return false
}

function cellLooksLikeNumber(s: string): boolean {
  const v = s.trim().replace(/[€$£¥₹\s]/g, '').replace(/[()]/g, '')
  if (!v) return false
  // Accept Spanish ("1.234,56") and English ("1,234.56") number formats.
  return /^-?\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d+)?$|^-?\d+(?:[\.,]\d+)?$/.test(v)
}

/**
 * Decide if `row` is a header row.
 *
 * A header row must:
 *   1. Have at least 2 non-empty cells (single-cell rows like
 *      "TIENDA EL BUEN PRECIO - CONTROL FINANCIERO 2024" are titles, not headers).
 *   2. Be mostly text (>50% non-numeric cells).
 *   3. Be followed by a row that contains at least one number or date —
 *      otherwise it's probably another metadata row, not a real header.
 */
function looksLikeHeader(
  row: Record<string, unknown> | unknown[],
  nextRow: Record<string, unknown> | unknown[] | null
): boolean {
  const values = (Array.isArray(row) ? row : Object.values(row))
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)

  // Rule 1: a header must have ≥2 non-empty cells.
  if (values.length < 2) return false

  // Rule 2: header cells are mostly text.
  const nonNumeric = values.filter((v) => isNaN(Number(v.replace(',', '.')))).length
  if (nonNumeric / values.length <= 0.5) return false

  // Rule 3: the immediately-following row must contain a number or a date.
  // (No follow-up rows? Then we have no data anyway — say it's not a header.)
  if (!nextRow) return false
  const nextValues = (Array.isArray(nextRow) ? nextRow : Object.values(nextRow))
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
  const hasDataSignal = nextValues.some((v) => cellLooksLikeNumber(v) || cellLooksLikeDate(v))
  return hasDataSignal
}

/**
 * Quick scan over the raw matrix counting number-format fingerprints to
 * decide which decimal separator the file uses. Only counts unambiguous
 * patterns (must include thousands separators) — single-separator cells
 * stay ambiguous and fall back to the parser's heuristic at amount time.
 */
function detectDecimalSeparator(matrix: string[][]): ',' | '.' | 'unknown' {
  const latamRegex = /\d{1,3}(?:\.\d{3})+,\d{1,2}/      // 1.234,56
  const usRegex    = /\d{1,3}(?:,\d{3})+\.\d{1,2}/      // 1,234.56
  let latam = 0
  let us = 0
  for (const row of matrix) {
    for (const cell of row) {
      if (latamRegex.test(cell)) latam++
      if (usRegex.test(cell)) us++
    }
  }
  if (latam > 0 && latam > us * 2) return ','
  if (us > 0 && us > latam * 2) return '.'
  return 'unknown'
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

  // Decide if row 0 is a real header (looking at row 1 as the data follow-up).
  const headerRowDetected = looksLikeHeader(matrix[0] ?? [], matrix[1] ?? null)

  let cleanRows: ParsedRow[]
  let columns: string[]

  if (headerRowDetected) {
    // Use row 0 as headers; rows 1+ as data.
    const rawHeaders = matrix[0] ?? []
    const width = Math.max(rawHeaders.length, ...matrix.slice(1).map((r) => r.length), 0)
    columns = Array.from({ length: width }, (_, i) => {
      const h = (rawHeaders[i] ?? '').trim()
      // Two columns may have the same header — disambiguate with the index.
      return h || `__col_${i}__`
    })
    cleanRows = []
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r]
      const entry: ParsedRow = {}
      for (let c = 0; c < width; c++) {
        entry[columns[c]] = (row[c] ?? '').trim()
      }
      const nonEmpty = Object.values(entry).filter((v) => v !== '')
      if (nonEmpty.length === 0) continue
      cleanRows.push(entry)
    }
  } else {
    // Header could not be confirmed at row 0 → key rows by NUMERIC INDEX
    // ("0","1","2"…) instead of inventing "Columna N" names. Claude can later
    // tell us the real header row via mapping.header_row, and the analyze
    // route re-indexes using that.
    const width = matrix.length > 0 ? Math.max(...matrix.map((r) => r.length)) : 0
    columns = Array.from({ length: width }, (_, i) => String(i))
    cleanRows = []
    for (const row of matrix) {
      const entry: ParsedRow = {}
      for (let c = 0; c < width; c++) {
        entry[String(c)] = (row[c] ?? '').trim()
      }
      const nonEmpty = Object.values(entry).filter((v) => v !== '')
      if (nonEmpty.length === 0) continue
      cleanRows.push(entry)
    }
    warnings.push(
      `[${sheetName}] No se confirmó la fila de cabecera — las filas quedan indexadas por posición (0,1,2…) hasta que la IA confirme la fila real.`
    )
  }

  const decimalSeparator = detectDecimalSeparator(matrix)

  return {
    name: sheetName,
    columns,
    rows: cleanRows,
    rawMatrix: matrix,
    formulasResolved,
    headerRowDetected,
    locale: { decimalSeparator },
  }
}

/**
 * Re-index a parsed sheet's `rows` using `headerRow` (1-indexed) as the
 * source of truth for column names. Used by the analyze route AFTER Claude
 * tells us "the real headers are on row 5, not row 1".
 *
 * Returns a fresh `ParsedSheet` with `rows` keyed by the headers found at
 * `headerRow`, and only including matrix rows that come after it.
 */
export function reindexSheetWithHeaderRow(
  sheet: ParsedSheet,
  headerRow: number
): ParsedSheet {
  const idx = headerRow - 1
  if (idx < 0 || idx >= sheet.rawMatrix.length) return sheet

  const rawHeaders = sheet.rawMatrix[idx] ?? []
  const dataRows = sheet.rawMatrix.slice(idx + 1)
  const width = Math.max(rawHeaders.length, ...dataRows.map((r) => r.length), 0)

  const columns = Array.from({ length: width }, (_, i) => {
    const h = (rawHeaders[i] ?? '').trim()
    return h || `__col_${i}__`
  })

  const rows: ParsedRow[] = []
  for (const row of dataRows) {
    const entry: ParsedRow = {}
    for (let c = 0; c < width; c++) {
      entry[columns[c]] = (row[c] ?? '').trim()
    }
    const nonEmpty = Object.values(entry).filter((v) => v !== '')
    if (nonEmpty.length === 0) continue
    rows.push(entry)
  }

  return {
    ...sheet,
    columns,
    rows,
    headerRowDetected: true,
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
