import XLSX from 'xlsx'
import * as chrono from 'chrono-node'

export type ParsedDate = {
  /** ISO YYYY-MM-DD, or null when nothing parseable */
  date: string | null
  confidence: 'high' | 'medium' | 'low'
  flags: string[]
}

export type ParseDateContext = {
  /** Year to assume when the input has no explicit year (e.g. "abril"). */
  fileYear?: number
  /** [min, max] year range observed in the file. Used to flag suspicious years. */
  yearRange?: [number, number]
}

// ── Spanish month vocabulary ─────────────────────────────────────────────────

const SPANISH_MONTHS: Record<string, string> = {
  enero: '01', ene: '01',
  febrero: '02', feb: '02',
  marzo: '03', mar: '03',
  abril: '04', abr: '04',
  mayo: '05', may: '05',
  junio: '06', jun: '06',
  julio: '07', jul: '07',
  agosto: '08', ago: '08',
  septiembre: '09', sep: '09', sept: '09', set: '09',
  octubre: '10', oct: '10',
  noviembre: '11', nov: '11',
  diciembre: '12', dic: '12',
}

const MONTH_NAMES_PIPE = Object.keys(SPANISH_MONTHS).join('|')

const MONTH_ONLY_REGEX = new RegExp(
  `^(?:de\\s+)?(?<month>${MONTH_NAMES_PIPE})(?:\\s+(?:de\\s+)?(?<year>\\d{4}))?$`,
  'i'
)

const SPANISH_FULL_DATE_REGEX = new RegExp(
  `^(?<day>\\d{1,2})[\\s\\-/.](?:de\\s+)?(?<month>${MONTH_NAMES_PIPE})[\\s\\-/.](?:de\\s+)?(?<year>\\d{2,4})$`,
  'i'
)

// Spanish "MES DD" pattern (without prepositions, e.g. "marzo 5" or "marzo 5 2024").
// chrono.es doesn't reliably parse this shape, so we handle it explicitly and
// label it as natural_language to match the test contract.
const SPANISH_MONTH_DAY_REGEX = new RegExp(
  `^(?<month>${MONTH_NAMES_PIPE})\\s+(?<day>\\d{1,2})(?:\\s+(?:de\\s+)?(?<year>\\d{4}))?$`,
  'i'
)

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toIsoDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function validIsoYmd(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  if (y < 1900 || y > 2200) return null
  return `${y}-${pad2(m)}-${pad2(d)}`
}

// ── Strategies (first match wins) ────────────────────────────────────────────

function tryDateInstance(input: unknown): ParsedDate | null {
  if (!(input instanceof Date)) return null
  const iso = toIsoDate(input)
  if (!iso) return null
  return { date: iso, confidence: 'high', flags: [] }
}

function tryExcelSerial(input: unknown): ParsedDate | null {
  if (typeof input !== 'number' || !Number.isFinite(input)) return null
  // 25000 ≈ 1968-06, 60000 ≈ 2064-04. Plausible Excel serials in this band.
  if (input < 25000 || input > 60000) return null
  try {
    const result = XLSX.SSF.parse_date_code(input) as
      | { y: number; m: number; d: number }
      | null
    if (!result) return null
    const iso = validIsoYmd(result.y, result.m, result.d)
    if (!iso) return null
    return { date: iso, confidence: 'high', flags: ['excel_serial'] }
  } catch {
    return null
  }
}

function tryIsoStrict(s: string): ParsedDate | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const iso = validIsoYmd(Number(m[1]), Number(m[2]), Number(m[3]))
  if (!iso) return null
  return { date: iso, confidence: 'high', flags: [] }
}

function tryDmy(s: string): ParsedDate | null {
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (!m) return null
  const iso = validIsoYmd(Number(m[3]), Number(m[2]), Number(m[1]))
  if (!iso) return null
  return { date: iso, confidence: 'high', flags: [] }
}

function tryDmyShort(s: string): ParsedDate | null {
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/)
  if (!m) return null
  const yy = Number(m[3])
  // 00-69 → 2000+yy, 70-99 → 1900+yy (typical heuristic)
  const year = yy <= 69 ? 2000 + yy : 1900 + yy
  const iso = validIsoYmd(year, Number(m[2]), Number(m[1]))
  if (!iso) return null
  return { date: iso, confidence: 'high', flags: ['two_digit_year'] }
}

function trySpanishFullDate(s: string): ParsedDate | null {
  const m = s.match(SPANISH_FULL_DATE_REGEX)
  if (!m || !m.groups) return null
  const month = SPANISH_MONTHS[m.groups.month.toLowerCase()]
  if (!month) return null
  const day = Number(m.groups.day)
  const yRaw = Number(m.groups.year)
  const year = yRaw < 100 ? (yRaw <= 69 ? 2000 + yRaw : 1900 + yRaw) : yRaw
  const iso = validIsoYmd(year, Number(month), day)
  if (!iso) return null
  const flags: string[] = []
  if (yRaw < 100) flags.push('two_digit_year')
  return { date: iso, confidence: 'high', flags }
}

function trySpanishMonthDay(s: string, ctx: ParseDateContext): ParsedDate | null {
  const m = s.match(SPANISH_MONTH_DAY_REGEX)
  if (!m || !m.groups) return null
  const month = SPANISH_MONTHS[m.groups.month.toLowerCase()]
  if (!month) return null
  const day = Number(m.groups.day)
  const explicitYear = m.groups.year
  const flags: string[] = ['natural_language']
  let year: number
  if (explicitYear) {
    year = Number(explicitYear)
  } else if (ctx.fileYear) {
    year = ctx.fileYear
    flags.push('year_inferred')
  } else {
    return null
  }
  const iso = validIsoYmd(year, Number(month), day)
  if (!iso) return null
  return { date: iso, confidence: 'medium', flags }
}

function tryMonthOnly(s: string, ctx: ParseDateContext): ParsedDate | null {
  const m = s.match(MONTH_ONLY_REGEX)
  if (!m || !m.groups) return null
  const monthKey = m.groups.month.toLowerCase()
  const month = SPANISH_MONTHS[monthKey]
  if (!month) return null
  const explicitYear = m.groups.year
  if (explicitYear) {
    const iso = validIsoYmd(Number(explicitYear), Number(month), 1)
    if (!iso) return null
    return { date: iso, confidence: 'medium', flags: ['month_only'] }
  }
  if (ctx.fileYear) {
    const iso = validIsoYmd(ctx.fileYear, Number(month), 1)
    if (!iso) return null
    return { date: iso, confidence: 'low', flags: ['month_only', 'year_inferred'] }
  }
  // Match but no year resolvable
  return { date: null, confidence: 'low', flags: ['month_only'] }
}

function tryChrono(
  s: string,
  ctx: ParseDateContext,
  locale: 'es' | 'en'
): ParsedDate | null {
  const lib = locale === 'es' ? chrono.es : chrono
  // Use refDate biased to fileYear (mid-year so chrono doesn't drift).
  const refDate = ctx.fileYear ? new Date(ctx.fileYear, 5, 15) : undefined
  const results = lib.parse(s, refDate)
  if (!results.length) return null
  const date = results[0].start.date()
  const iso = toIsoDate(date)
  if (!iso) return null

  const flags: string[] = [locale === 'es' ? 'natural_language' : 'natural_language_en']
  const hasExplicitYear = /\b(19|20|21)\d{2}\b/.test(s)
  if (!hasExplicitYear && ctx.fileYear) flags.push('year_inferred')

  return { date: iso, confidence: 'medium', flags }
}

// ── Post-processing ──────────────────────────────────────────────────────────

function applyYearFlags(result: ParsedDate, ctx: ParseDateContext): ParsedDate {
  if (!result.date) return result
  const year = Number(result.date.slice(0, 4))
  const currentYear = new Date().getFullYear()
  const flags = [...result.flags]
  let confidence = result.confidence

  if (ctx.yearRange) {
    const [min, max] = ctx.yearRange
    if (year < min - 1 || year > max + 1) {
      flags.push('suspicious_year')
      if (confidence === 'high') confidence = 'medium'
    }
  }

  if (year > currentYear + 1) {
    if (!flags.includes('future_year')) flags.push('future_year')
  }

  return { date: result.date, confidence, flags }
}

// ── Public entrypoint ────────────────────────────────────────────────────────

export function parseDate(input: unknown, ctx: ParseDateContext = {}): ParsedDate {
  // 1. Date instance
  const fromDate = tryDateInstance(input)
  if (fromDate) return applyYearFlags(fromDate, ctx)

  // 2. Excel serial (numeric input only)
  const fromSerial = tryExcelSerial(input)
  if (fromSerial) return applyYearFlags(fromSerial, ctx)

  // From here, we only handle strings.
  if (input === null || input === undefined) {
    return { date: null, confidence: 'low', flags: ['empty'] }
  }
  let raw = String(input).trim()
  if (raw === '') return { date: null, confidence: 'low', flags: ['empty'] }

  // 3. ISO strict
  const fromIso = tryIsoStrict(raw)
  if (fromIso) return applyYearFlags(fromIso, ctx)

  // 4. DD/MM/YYYY
  const fromDmy = tryDmy(raw)
  if (fromDmy) return applyYearFlags(fromDmy, ctx)

  // 5. DD/MM/YY
  const fromDmyShort = tryDmyShort(raw)
  if (fromDmyShort) return applyYearFlags(fromDmyShort, ctx)

  // 6. Spanish full date "DD MMM YYYY" — checked before month-only/chrono so
  //    that "1 ago 24" doesn't get hijacked as natural language.
  const fromSpanishFull = trySpanishFullDate(raw)
  if (fromSpanishFull) return applyYearFlags(fromSpanishFull, ctx)

  // 7. Spanish "MES DD" or "MES DD YYYY" ("marzo 5"). chrono.es is unreliable
  //    on this shape, so handle explicitly and tag as natural_language.
  const fromMonthDay = trySpanishMonthDay(raw, ctx)
  if (fromMonthDay) return applyYearFlags(fromMonthDay, ctx)

  // 8. Month-only ("abril", "mayo 2024") — must run before chrono so the
  //    flag is 'month_only' rather than 'natural_language' for these inputs.
  const fromMonth = tryMonthOnly(raw, ctx)
  if (fromMonth) return applyYearFlags(fromMonth, ctx)

  // 8. chrono.es
  const fromChronoEs = tryChrono(raw, ctx, 'es')
  if (fromChronoEs) return applyYearFlags(fromChronoEs, ctx)

  // 9. chrono default (English)
  const fromChronoEn = tryChrono(raw, ctx, 'en')
  if (fromChronoEn) return applyYearFlags(fromChronoEn, ctx)

  return { date: null, confidence: 'low', flags: ['unparseable'] }
}
