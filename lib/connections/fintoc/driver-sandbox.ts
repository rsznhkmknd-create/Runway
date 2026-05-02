import type { ConnectionDriver, SyncTransaction } from '@/lib/connections/types'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const EXPENSE_DESCRIPTIONS = [
  ['Sodimac',          'Materiales'],
  ['Lider',            'Suministros'],
  ['AWS Chile',        'Servicios cloud'],
  ['Movistar',         'Telecomunicaciones'],
  ['Enel',             'Electricidad'],
  ['Aguas Andinas',    'Servicios básicos'],
  ['Uber Eats',        'Comidas'],
  ['Copec',            'Combustible'],
  ['Falabella',        'Compras'],
] as const

const INCOME_DESCRIPTIONS = [
  ['Transferencia recibida — Constructora Andes',  'Ventas'],
  ['Transferencia recibida — Inversiones Costanera','Ventas'],
  ['Pago Webpay — Tienda online',                  'Ventas'],
  ['Transferencia recibida — Servicios Atacama',   'Ventas'],
] as const

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export const fintocSandboxDriver: ConnectionDriver = {
  type: 'fintoc',
  mode: 'sandbox',
  async fetch({ sinceIso }) {
    const rand = seeded(7)
    const cutoff = sinceIso ? new Date(sinceIso).getTime() : 0

    const transactions: SyncTransaction[] = []

    for (let i = 0; i < 38; i++) {
      const daysAgo = Math.floor(rand() * 28)
      const date = daysAgoIso(daysAgo)
      if (new Date(date).getTime() < cutoff) continue

      const isIncome = rand() > 0.7
      const [desc, category] = isIncome
        ? INCOME_DESCRIPTIONS[Math.floor(rand() * INCOME_DESCRIPTIONS.length)]
        : EXPENSE_DESCRIPTIONS[Math.floor(rand() * EXPENSE_DESCRIPTIONS.length)]

      const amount = isIncome
        ? Math.round((180_000 + rand() * 1_400_000) / 1000) * 1000
        : Math.round((9_900 + rand() * 480_000) / 100) * 100

      transactions.push({
        external_id: `FINTOC-MOV-${500_000 + i}`,
        amount,
        type:        isIncome ? 'income' : 'expense',
        category,
        description: desc,
        date,
      })
    }

    return { transactions, invoices: [] }
  },
}
