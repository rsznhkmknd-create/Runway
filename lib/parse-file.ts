import * as XLSX from 'xlsx'

export type ParsedRow = Record<string, string>

export interface ParsedFile {
  columns: string[]
  rows: ParsedRow[]
  sheetName: string
}

export function parseUploadedFile(buffer: Buffer, filename: string): ParsedFile {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false,
    dateNF: 'YYYY-MM-DD',
    cellDates: false,
  })

  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  const rows = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'YYYY-MM-DD',
  })

  if (!rows.length) {
    throw new Error('El archivo no contiene datos.')
  }

  // Ensure all values are strings and trim whitespace
  const cleanRows = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? '').trim()])
    )
  )

  const columns = Object.keys(cleanRows[0])

  return { columns, rows: cleanRows, sheetName }
}
