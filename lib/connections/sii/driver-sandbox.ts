import type { ConnectionDriver, SyncInvoice } from '@/lib/connections/types'

// Deterministic pseudo-random so dashboards stay stable between syncs.
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const SUPPLIERS = [
  'Sodimac',           'Lider',          'Falabella',     'Jumbo',
  'Walmart Chile',     'Tottus',         'Easy',          'Construmart',
  'Entel',             'Movistar Chile', 'VTR',           'Claro',
]

const CUSTOMERS = [
  'Constructora Andes Ltda.',  'Inversiones Costanera SpA', 'Servicios Atacama SA',
  'Comercial Maipú EIRL',      'Tecnoplast Chile',          'Importadora Bío-Bío',
  'Distribuidora Patagonia',   'Logística Valparaíso',
]

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export const siiSandboxDriver: ConnectionDriver = {
  type: 'sii',
  mode: 'sandbox',
  async fetch({ sinceIso }) {
    const rand = seeded(42)
    const cutoff = sinceIso ? new Date(sinceIso).getTime() : 0

    const invoices: SyncInvoice[] = []

    // 12 facturas emitidas (income)
    for (let i = 0; i < 12; i++) {
      const daysAgo = Math.floor(rand() * 28)
      const date = daysAgoIso(daysAgo)
      if (new Date(date).getTime() < cutoff) continue
      invoices.push({
        external_id: `SII-EMI-${100_000 + i}`,
        client_name: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
        amount:     Math.round((180_000 + rand() * 1_400_000) / 1000) * 1000,
        currency:   'CLP',
        due_date:   date,
        invoice_kind: 'issued',
        status:     rand() > 0.4 ? 'pending' : 'paid',
      })
    }

    // 18 facturas recibidas (expense)
    for (let i = 0; i < 18; i++) {
      const daysAgo = Math.floor(rand() * 28)
      const date = daysAgoIso(daysAgo)
      if (new Date(date).getTime() < cutoff) continue
      invoices.push({
        external_id: `SII-REC-${200_000 + i}`,
        client_name: SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)],
        amount:     Math.round((25_000 + rand() * 480_000) / 1000) * 1000,
        currency:   'CLP',
        due_date:   date,
        invoice_kind: 'received',
        status:     'pending',
      })
    }

    // 8 boletas electrónicas (income directo, sin estado pago)
    for (let i = 0; i < 8; i++) {
      const daysAgo = Math.floor(rand() * 28)
      const date = daysAgoIso(daysAgo)
      if (new Date(date).getTime() < cutoff) continue
      invoices.push({
        external_id: `SII-BOL-${300_000 + i}`,
        client_name: 'Cliente boleta',
        amount:     Math.round((9_900 + rand() * 89_000) / 100) * 100,
        currency:   'CLP',
        due_date:   date,
        invoice_kind: 'boleta',
        status:     'paid',
      })
    }

    return { transactions: [], invoices }
  },
}
