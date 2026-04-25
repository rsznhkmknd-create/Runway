import type { ParsedSheet } from '../parse-file'

/**
 * One contiguous tabular block detected inside a sheet. A region is a
 * connected component of non-empty cells whose bounding box passes the
 * minimum-size + numeric-density filters.
 */
export type DetectedRegion = {
  /** Stable identifier per detected block, e.g. "Hoja1_region1". */
  id: string
  sheetName: string
  /** 1-indexed bounding box in Excel-style coordinates (inclusive). */
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  /** Single-cell title found at the top row of the bbox aligned with startCol. */
  sectionTitle?: string
  /**
   * Slice of the sheet's matrix covering the region. Cells preserve the type
   * the parser produced (in the current pipeline always string, but the
   * union allows numbers or nulls if the parser changes).
   */
  rawMatrix: (string | number | null)[][]
  /**
   * 'high' when a clear sectionTitle was identified above the data,
   * 'medium' when the bbox passes filters but no title was found,
   * 'low' is reserved for future heuristics.
   */
  confidence: 'high' | 'medium' | 'low'
}

// ── Heuristics ──────────────────────────────────────────────────────────────

/**
 * "Looks like a number": pure numeric content (with currency symbols, thousand
 * separators, decimal commas/periods, or accounting parens). Date-like strings
 * are explicitly rejected so the density threshold isn't fooled by date columns.
 */
function looksNumeric(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v)
  if (v === null || v === undefined) return false
  const s = String(v).trim()
  if (s === '') return false
  // Reject DD/MM/YYYY / YYYY-MM-DD / DD-MM-YY etc.
  if (/^\d{1,4}[\/\-]/.test(s)) return false
  // Reject mixed letter+number (e.g. "45 pares", "como 9600", "muchos", "S/")
  if (/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(s)) return false
  const clean = s.replace(/[€$£¥₹\s()"']/g, '')
  return /^-?[\d.,]+$/.test(clean) && /\d/.test(clean)
}

function isOccupied(cell: unknown): boolean {
  if (cell === null || cell === undefined) return false
  return String(cell).trim() !== ''
}

// ── Connected-component flood fill ──────────────────────────────────────────

type Cell = { r: number; c: number }

function floodFillComponents(occ: boolean[][], height: number, width: number): Cell[][] {
  const visited: boolean[][] = Array.from({ length: height }, () =>
    new Array(width).fill(false)
  )
  const components: Cell[][] = []

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!occ[r]![c] || visited[r]![c]) continue
      const comp: Cell[] = []
      const stack: Cell[] = [{ r, c }]
      while (stack.length) {
        const top = stack.pop() as Cell
        if (top.r < 0 || top.r >= height || top.c < 0 || top.c >= width) continue
        if (visited[top.r]![top.c] || !occ[top.r]![top.c]) continue
        visited[top.r]![top.c] = true
        comp.push(top)
        // 4-neighbour: up/down/left/right
        stack.push({ r: top.r - 1, c: top.c })
        stack.push({ r: top.r + 1, c: top.c })
        stack.push({ r: top.r, c: top.c - 1 })
        stack.push({ r: top.r, c: top.c + 1 })
      }
      if (comp.length > 0) components.push(comp)
    }
  }

  return components
}

// ── Section title detection ────────────────────────────────────────────────

/**
 * If the top row of the bounding box has exactly one non-empty cell aligned
 * with `startCol`, that cell is the section title. Returns undefined when the
 * top row already contains the table headers (multiple non-empty cells).
 */
function detectSectionTitle(
  matrix: string[][],
  topRow: number,
  startCol: number,
  endCol: number
): string | undefined {
  const row = matrix[topRow] ?? []
  const nonEmpty: { col: number; value: string }[] = []
  for (let c = startCol; c <= endCol; c++) {
    const v = String(row[c] ?? '').trim()
    if (v !== '') nonEmpty.push({ col: c, value: v })
  }
  if (nonEmpty.length === 1 && nonEmpty[0]!.col === startCol) {
    return nonEmpty[0]!.value
  }
  return undefined
}

// ── Public entrypoint ──────────────────────────────────────────────────────

const MIN_ROWS = 3
const MIN_COLS = 2
const MIN_NUMERIC_CELLS = 4

export function detectRegions(sheet: ParsedSheet): DetectedRegion[] {
  const matrix = sheet.rawMatrix
  if (matrix.length === 0) return []

  const height = matrix.length
  const width = Math.max(0, ...matrix.map((r) => r.length))
  if (width === 0) return []

  // Build occupancy grid
  const occ: boolean[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => isOccupied(matrix[r]?.[c]))
  )

  const components = floodFillComponents(occ, height, width)

  const regions: DetectedRegion[] = []
  for (const comp of components) {
    const rs = comp.map((p) => p.r)
    const cs = comp.map((p) => p.c)
    const minR = Math.min(...rs)
    const maxR = Math.max(...rs)
    const minC = Math.min(...cs)
    const maxC = Math.max(...cs)
    const rows = maxR - minR + 1
    const cols = maxC - minC + 1

    // Filter — too small to be a real table.
    if (rows < MIN_ROWS || cols < MIN_COLS) continue

    // Filter — needs enough numeric cells to be a real data table
    // (drops note/summary blocks that have a title but only 1-2 numbers).
    let numericCount = 0
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (looksNumeric(matrix[r]?.[c])) numericCount++
      }
    }
    if (numericCount < MIN_NUMERIC_CELLS) continue

    const sectionTitle = detectSectionTitle(matrix, minR, minC, maxC)

    // Slice the matrix into the region's local coordinates.
    const slice: (string | number | null)[][] = []
    for (let r = minR; r <= maxR; r++) {
      const row: (string | number | null)[] = []
      for (let c = minC; c <= maxC; c++) {
        const v = matrix[r]?.[c]
        row.push(v === '' || v === undefined || v === null ? null : v)
      }
      slice.push(row)
    }

    regions.push({
      id: `${sheet.name}_region${regions.length + 1}`,
      sheetName: sheet.name,
      // Convert from 0-indexed to 1-indexed Excel coordinates.
      startRow: minR + 1,
      endRow: maxR + 1,
      startCol: minC + 1,
      endCol: maxC + 1,
      sectionTitle,
      rawMatrix: slice,
      confidence: sectionTitle ? 'high' : 'medium',
    })
  }

  return regions
}

/**
 * Rough fraction of the sheet's non-empty cells that the largest detected
 * region covers. The analyze route uses this to decide whether to fall back
 * to the single-region pipeline (>80% coverage = "one big table, no need
 * to multi-region anything").
 */
export function largestRegionOccupancy(
  sheet: ParsedSheet,
  regions: DetectedRegion[]
): number {
  if (regions.length === 0) return 0
  let totalNonEmpty = 0
  for (const row of sheet.rawMatrix) {
    for (const cell of row) {
      if (isOccupied(cell)) totalNonEmpty++
    }
  }
  if (totalNonEmpty === 0) return 0
  let largest = 0
  for (const r of regions) {
    let count = 0
    for (const row of r.rawMatrix) {
      for (const cell of row) {
        if (isOccupied(cell)) count++
      }
    }
    if (count > largest) largest = count
  }
  return largest / totalNonEmpty
}
