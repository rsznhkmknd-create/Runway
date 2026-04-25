export type ParsedAmount = {
  /** parsed numeric value, or null when nothing was parseable */
  amount: number | null
  confidence: 'high' | 'medium' | 'low'
  flags: string[]
  /** additional numbers found in the same cell (e.g. "ya pago 500, falta 700") */
  extraNumbers?: number[]
}

export type ParseAmountContext = {
  /** Decimal separator known for the file. Disambiguates single-separator strings. */
  decimalSeparator?: ',' | '.'
}

// ── Patterns ─────────────────────────────────────────────────────────────────

// Approximation markers — Spanish + symbols.
// Order matters: phrases first, then single tokens.
const APPROXIMATION_PATTERNS: RegExp[] = [
  /m[áa]s\s+o\s+menos/gi,
  /\baprox(?:imado)?\b/gi,
  /\bcomo\b/gi,
  /\bcreo\b/gi,
  /[~≈]/g,
  /\?\?+/g,
  /!!+/g,
]

// Currency symbols and ISO codes.
const CURRENCY_PATTERNS: RegExp[] = [
  /\$/g,
  /€/g,
  /\bMXN\b/gi,
  /\bCLP\b/gi,
  /\bARS\b/gi,
  /\bCOP\b/gi,
  /\bPEN\b/gi,
  /\bUSD\b/gi,
  /\bEUR\b/gi,
  /S\//g,
  /R\$/g,
  /\bBs\b/gi,
]

// Non-numeric placeholders that should yield null.
const PLACEHOLDER_PATTERN =
  /^(variable|pendiente|no\s+se|no\s+s[ée]|ni\s+idea|sin\s+saber|depende|varios|muchos)$/i

// Excel formula errors.
const EXCEL_ERROR_PATTERN = /^#(NAME|REF|VALUE|N\/A|DIV\/0)[\?!]?$/i

// One number, possibly with thousand separators and a decimal part.
// Two alternatives so we capture both "1.234,56" / "1,234.56" and bare "1234.56".
const NUMBER_PATTERN =
  /-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?/g

// Flags that drop confidence from high → medium.
const MEDIUM_CONFIDENCE_FLAGS = new Set([
  'approximation',
  'multiple_numbers_in_cell',
  'ambiguous_decimal_separator',
])

// ── Per-token numeric parser ─────────────────────────────────────────────────

function parseSingleNumber(
  raw: string,
  ctx: ParseAmountContext,
  flagsOut: string[]
): number | null {
  const s = raw.trim()
  if (s === '') return null

  const lastComma = s.lastIndexOf(',')
  const lastPeriod = s.lastIndexOf('.')
  const hasComma = lastComma >= 0
  const hasPeriod = lastPeriod >= 0

  let normalized: string

  if (hasComma && hasPeriod) {
    // Both present → the LATER one is the decimal separator.
    if (lastComma > lastPeriod) {
      // Spanish format: 1.234,56 → 1234.56
      normalized = s.replace(/\./g, '').replace(',', '.')
    } else {
      // English format: 1,234.56 → 1234.56
      normalized = s.replace(/,/g, '')
    }
  } else if (hasComma) {
    if (ctx.decimalSeparator === ',') {
      normalized = s.replace(',', '.')
    } else if (ctx.decimalSeparator === '.') {
      normalized = s.replace(/,/g, '')
    } else {
      // Heuristic: exactly 3 digits after a single comma → likely thousands
      // (ambiguous, drop to medium).
      const lastSeg = s.split(',').pop() ?? ''
      if (/^\d{3}$/.test(lastSeg)) {
        if (!flagsOut.includes('ambiguous_decimal_separator')) {
          flagsOut.push('ambiguous_decimal_separator')
        }
        normalized = s.replace(/,/g, '')
      } else {
        normalized = s.replace(',', '.')
      }
    }
  } else if (hasPeriod) {
    if (ctx.decimalSeparator === '.') {
      normalized = s
    } else if (ctx.decimalSeparator === ',') {
      normalized = s.replace(/\./g, '')
    } else {
      const lastSeg = s.split('.').pop() ?? ''
      if (/^\d{3}$/.test(lastSeg)) {
        if (!flagsOut.includes('ambiguous_decimal_separator')) {
          flagsOut.push('ambiguous_decimal_separator')
        }
        normalized = s.replace(/\./g, '')
      } else {
        normalized = s
      }
    }
  } else {
    normalized = s
  }

  const n = parseFloat(normalized)
  if (!Number.isFinite(n)) return null
  return n
}

// ── Public entrypoint ────────────────────────────────────────────────────────

export function parseAmount(
  input: unknown,
  ctx: ParseAmountContext = {}
): ParsedAmount {
  // Direct number
  if (typeof input === 'number') {
    if (Number.isFinite(input)) return { amount: input, confidence: 'high', flags: [] }
    return { amount: null, confidence: 'low', flags: ['non_finite'] }
  }

  if (input === null || input === undefined) {
    return { amount: null, confidence: 'low', flags: ['empty'] }
  }

  const raw = String(input).trim()
  if (raw === '') return { amount: null, confidence: 'low', flags: ['empty'] }

  // Excel error → null low
  if (EXCEL_ERROR_PATTERN.test(raw)) {
    return { amount: null, confidence: 'low', flags: ['excel_error'] }
  }

  // Pure non-numeric placeholder → null low
  if (PLACEHOLDER_PATTERN.test(raw)) {
    return { amount: null, confidence: 'low', flags: ['non_numeric_placeholder'] }
  }

  const flags: string[] = []
  let str = raw

  // Accounting parens negative — record now, strip parens.
  const isAccountingNegative = str.startsWith('(') && str.endsWith(')')
  if (isAccountingNegative) {
    str = str.slice(1, -1).trim()
    flags.push('accounting_negative')
  }

  // Strip approximation markers
  let approxMatched = false
  for (const re of APPROXIMATION_PATTERNS) {
    if (re.test(str)) {
      approxMatched = true
      str = str.replace(re, ' ')
    }
  }
  if (approxMatched) flags.push('approximation')

  // Strip currency
  let currencyMatched = false
  for (const re of CURRENCY_PATTERNS) {
    if (re.test(str)) {
      currencyMatched = true
      str = str.replace(re, ' ')
    }
  }
  if (currencyMatched) flags.push('currency_cleaned')

  str = str.trim()
  if (str === '') {
    return { amount: null, confidence: 'low', flags: [...flags, 'empty_after_strip'] }
  }

  // Find numeric tokens
  const matches = Array.from(str.match(NUMBER_PATTERN) ?? [])
  const firstMatch = matches[0]

  if (matches.length === 0 || firstMatch === undefined) {
    return { amount: null, confidence: 'low', flags: [...flags, 'no_number_found'] }
  }

  const first = parseSingleNumber(firstMatch, ctx, flags)
  if (first === null) {
    return { amount: null, confidence: 'low', flags: [...flags, 'unparseable'] }
  }

  let amount = first
  if (isAccountingNegative) amount = -Math.abs(amount)

  if (matches.length > 1) {
    flags.push('multiple_numbers_in_cell')
    const extraNumbers: number[] = []
    for (let i = 1; i < matches.length; i++) {
      const tok = matches[i]
      if (tok === undefined) continue
      const n = parseSingleNumber(tok, ctx, flags)
      if (n !== null) extraNumbers.push(n)
    }
    const confidence: ParsedAmount['confidence'] = 'medium'
    return { amount, confidence, flags, extraNumbers }
  }

  const confidence: ParsedAmount['confidence'] = flags.some((f) =>
    MEDIUM_CONFIDENCE_FLAGS.has(f)
  )
    ? 'medium'
    : 'high'

  return { amount, confidence, flags }
}
