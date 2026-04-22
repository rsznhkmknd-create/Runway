import type { ReportType } from './types'

/** Format a Date as YYYY-MM-DD (UTC-safe). */
export function iso(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export type Period = { start: string; end: string }

/**
 * Compute the current and previous periods for a given report type.
 * - weekly: last 7 days ending today
 * - monthly: last 30 days ending today
 * Previous period is the 7 / 30 days immediately before that.
 */
export function periodsFor(type: ReportType, now: Date = new Date()): {
  current: Period
  previous: Period
} {
  const days = type === 'weekly' ? 7 : 30
  const end = now
  const start = addDays(end, -days + 1)
  const prevEnd = addDays(start, -1)
  const prevStart = addDays(prevEnd, -days + 1)

  return {
    current:  { start: iso(start),     end: iso(end)     },
    previous: { start: iso(prevStart), end: iso(prevEnd) },
  }
}

export function formatPeriod(p: Period, type: ReportType): string {
  const startDate = new Date(p.start)
  const endDate = new Date(p.end)
  const same = startDate.getMonth() === endDate.getMonth()
  if (type === 'weekly' || !same) {
    return `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return endDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}
