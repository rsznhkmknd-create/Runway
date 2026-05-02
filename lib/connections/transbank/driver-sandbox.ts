import type { ConnectionDriver, SyncTransaction } from '@/lib/connections/types'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function isoAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString().slice(0, 10)
}

export const transbankSandboxDriver: ConnectionDriver = {
  type: 'transbank',
  mode: 'sandbox',
  async fetch({ sinceIso }) {
    const rand = seeded(91)
    const cutoff = sinceIso ? new Date(sinceIso).getTime() : 0
    const transactions: SyncTransaction[] = []

    // Sandbox = última semana de ventas con tarjeta. ~25 ventas/día.
    for (let day = 6; day >= 0; day--) {
      const count = 18 + Math.floor(rand() * 14)
      for (let i = 0; i < count; i++) {
        const hour   = 9 + Math.floor(rand() * 11)
        const minute = Math.floor(rand() * 60)
        const date   = isoAt(day, hour, minute)
        if (new Date(date).getTime() < cutoff && day !== 0) continue
        const amount = Math.round((6_900 + rand() * 78_000) / 100) * 100
        transactions.push({
          external_id: `TBK-${date.replace(/-/g, '')}-${day}-${i}`,
          amount,
          type:        'income',
          category:    'Ventas POS',
          description: `Venta tarjeta — Webpay ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
          date,
        })
      }
    }

    return { transactions, invoices: [] }
  },
}
