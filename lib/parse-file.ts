import * as XLSX from 'xlsx'

export type ParsedRow = Record<string, string>

export interface ParsedFile {
  columns: string[]
  rows: ParsedRow[]
  sheetName: string
  warnings: string[]
}

/**
 * Evaluate a simple Excel formula like =F4*G4, =A1+B1, =A1*(1-0.21), =SUM(A1:A5).
 * Returns null if the formula cannot be safely resolved.
 *
 * Handles:
 *   - cell references (A1, B2, AA10)  → looks up value in `resolver`
 *   - adjacent refs with no operator  (=F4G4 → F4*G4), common user typo
 *   - +, -, *, /, parentheses, constants
 *   - SUM(range) and AVG/AVERAGE(range)
 */
function evaluateFormula(
  formula: string,
  resolver: (ref: string) => number
): number | null {
  let expr = formula.trim().replace(/^=/, '').toUpperCase()

  // SUM(A1:A5) / AVERAGE(A1:B3)
  const rangeFn = expr.match(/^(SUM|AVG|AVERAGE)\(([A-Z]+\d+):([A-Z]+\d+)\)$/)
  if (rangeFn) {
    const [, fn, startRef, endRef] = rangeFn
    const colStart = startRef.match(/^([A-Z]+)/)![1]
    const colEnd = endRef.match(/^([A-Z]+)/)![1]
    const rowStart = parseInt(startRef.match(/(\d+)$/)![1], 10)
    const rowEnd = parseInt(endRef.match(/(\d+)$/)![1], 10)
    if (colStart !== colEnd) return null // multi-column range not supported
    const values: number[] = []
    for (let r = rowStart; r <= rowEnd; r++) {
      values.push(resolver(`${colStart}${r}`))
    }
    if (fn === 'SUM') return values.reduce((a, b) => a + b, 0)
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  // Adjacent cell refs: =F4G4 → F4*G4 (common typo). Only safe if the whole
  // expression is two refs concatenated with nothing between them.
  const adjacent = expr.match(/^([A-Z]+\d+)([A-Z]+\d+)$/)
  if (adjacent) {
    expr = `${adjacent[1]}*${adjacent[2]}`
  }

  // Replace cell references with their numeric values.
  expr = expr.replace(/[A-Z]+\d+/g, (ref) => {
    const v = resolver(ref)
    return `(${v})`
  })

  // Allow only digits, operators, dots, parens, minus, spaces.
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

  // Cached value first
  if (typeof cell.v === 'number') return cell.v
  if (typeof cell.v === 'string') {
    const parsed = Number(cell.v.replace(',', '.'))
    if (!isNaN(parsed)) return parsed
  }

  // Resolve formula recursively
  if (typeof cell.f === 'string') {
    const resolved = evaluateFormula(cell.f, (r) => cellNumericValue(sheet, r, seen))
    if (resolved != null) return resolved
  }

  return 0
}

/**
 * Walk every cell in the worksheet and resolve any formula that either
 *   - still carries the raw `=...` text as `.v`, or
 *   - has a `.f` but no cached `.v` / `.w`
 * by computing it against the other cells. This means formulas work even
 * when the file was written without cached values.
 */
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
      const value = evaluateFormula(formula, (r) =>
        cellNumericValue(sheet, r)
      )
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
  // A header row is mostly non-numeric strings.
  const values = Object.values(row).map((v) => String(v ?? '').trim()).filter(Boolean)
  if (values.length === 0) return false
  const nonNumeric = values.filter((v) => isNaN(Number(v.replace(',', '.')))).length
  return nonNumeric / values.length > 0.5
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

  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Resolve any remaining formulas (cells that have `.f` but no cached `.v`,
  // or where `.v` is still the raw `=...` text).
  const resolvedCount = resolveFormulas(worksheet)
  if (resolvedCount > 0) {
    warnings.push(
      `Se calcularon ${resolvedCount} fórmulas automáticamente leyendo las celdas referenciadas.`
    )
  }

  // First try with header row as-is
  let rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'YYYY-MM-DD',
  })

  // If the file has no headers at all, fall back to array-of-arrays and
  // synthesise column names like "Columna 1".
  if (rawRows.length === 0 || !looksLikeHeader(rawRows[0] ?? {})) {
    const arr = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      defval: '',
      raw: false,
      dateNF: 'YYYY-MM-DD',
      header: 1,
    })
    if (arr.length === 0) throw new Error('El archivo está vacío.')
    const width = Math.max(...arr.map((r) => r.length))
    const cols = Array.from({ length: width }, (_, i) => `Columna ${i + 1}`)
    rawRows = arr.map((r) =>
      Object.fromEntries(cols.map((c, i) => [c, r[i] ?? '']))
    )
    warnings.push(
      'El archivo no tiene cabeceras — se asignaron nombres genéricos (Columna 1, Columna 2, …).'
    )
  }

  // Normalize keys + values to trimmed strings, drop empty rows.
  const cleanRows: ParsedRow[] = []
  for (const row of rawRows) {
    const entry = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [String(k).trim(), String(v ?? '').trim()])
    )
    const nonEmpty = Object.values(entry).filter((v) => v !== '')
    if (nonEmpty.length === 0) continue
    cleanRows.push(entry)
  }

  if (cleanRows.length === 0) {
    throw new Error('El archivo no contiene filas con datos.')
  }

  const columns = Array.from(
    new Set(cleanRows.flatMap((r) => Object.keys(r)))
  )

  return { columns, rows: cleanRows, sheetName, warnings }
}
