/** Coerce anything to a finite number, or fall back to `fallback` (default 0). */
export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (isFinite(n)) return n
  }
  return fallback
}

/** Returns true when the value can be parsed into a valid Date. */
export function isValidDate(value: unknown): boolean {
  if (value == null || value === '') return false
  const d = new Date(value as string | number | Date)
  return !isNaN(d.getTime())
}

/** Format a date string in es-ES; returns `fallback` on invalid input. */
export function safeFormatDate(
  value: unknown,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  fallback = '—'
): string {
  if (!isValidDate(value)) return fallback
  return new Date(value as string | number | Date).toLocaleDateString('es-ES', options)
}

/** Today as YYYY-MM-DD, UTC-safe enough for HTML <input type="date">. */
export function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
