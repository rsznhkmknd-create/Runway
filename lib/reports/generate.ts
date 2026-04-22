import { anthropic } from '@/lib/claude'
import type { ReportContent, ReportType } from './types'

type Transaction = {
  amount:      number
  type:        'income' | 'expense'
  category:    string
  description: string | null
  date:        string
}

type Profile = {
  company_name:  string | null
  currency:      string
  industry:      string | null
  business_type: string | null
}

type GenerateArgs = {
  reportType:      ReportType
  periodStart:     string
  periodEnd:       string
  previousStart:   string
  previousEnd:     string
  currentTx:       Transaction[]
  previousTx:      Transaction[]
  cashBalance:     number
  profile:         Profile
}

const SYSTEM_PROMPT = `Eres un CFO fraccional con 15 años de experiencia en finanzas de startups y PYMEs. Tu trabajo es analizar datos financieros y entregar reportes directos, accionables y con opiniones concretas — no genéricos.

Reglas absolutas:
- Habla en español, en primera persona plural ("vemos que...", "tu negocio...") y en lenguaje directo, como un CFO que conoce al dueño.
- Usa SIEMPRE números concretos (amounts, porcentajes, cuentas), NUNCA afirmaciones vacías como "los ingresos son buenos".
- Las recomendaciones deben ser ACCIONES específicas, no consejos abstractos. Ej: "Negociar el pago de Proveedor X a 60 días" en vez de "optimizar cash flow".
- Si los datos muestran riesgo, dilo claramente sin suavizarlo.
- Si no hay datos suficientes para una conclusión, dilo explícitamente en alertas.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. Sin markdown, sin prefacios, sin backticks.`

function summarizeTx(txs: Transaction[]) {
  const byCategory = new Map<string, { income: number; expense: number }>()
  let totalIncome = 0
  let totalExpense = 0
  const incomeByDesc = new Map<string, number>()
  const expenseByDesc = new Map<string, number>()

  for (const t of txs) {
    if (t.type === 'income') {
      totalIncome += t.amount
      const key = t.description?.trim() || t.category
      incomeByDesc.set(key, (incomeByDesc.get(key) ?? 0) + t.amount)
    } else {
      totalExpense += t.amount
      const key = t.description?.trim() || t.category
      expenseByDesc.set(key, (expenseByDesc.get(key) ?? 0) + t.amount)
    }
    const entry = byCategory.get(t.category) ?? { income: 0, expense: 0 }
    if (t.type === 'income') entry.income += t.amount
    else entry.expense += t.amount
    byCategory.set(t.category, entry)
  }

  const top = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

  return {
    totalIncome:    Math.round(totalIncome * 100) / 100,
    totalExpense:   Math.round(totalExpense * 100) / 100,
    byCategory:     Array.from(byCategory.entries()).map(([category, v]) => ({
      category,
      income:  Math.round(v.income * 100) / 100,
      expense: Math.round(v.expense * 100) / 100,
    })),
    topIncomeSources: top(incomeByDesc),
    topExpenses:      top(expenseByDesc),
    count:            txs.length,
  }
}

export async function generateReportContent(args: GenerateArgs): Promise<ReportContent> {
  const current  = summarizeTx(args.currentTx)
  const previous = summarizeTx(args.previousTx)
  const windowDays = args.reportType === 'weekly' ? 7 : 30

  const userPrompt = `Genera un reporte financiero ${args.reportType === 'weekly' ? 'semanal' : 'mensual'} para esta empresa.

EMPRESA:
${JSON.stringify(args.profile)}

PERÍODO ACTUAL: ${args.periodStart} → ${args.periodEnd} (${windowDays} días)
PERÍODO ANTERIOR: ${args.previousStart} → ${args.previousEnd} (${windowDays} días)

SALDO DE CAJA ACTUAL: ${args.cashBalance} ${args.profile.currency}

RESUMEN PERÍODO ACTUAL:
${JSON.stringify(current, null, 2)}

RESUMEN PERÍODO ANTERIOR:
${JSON.stringify(previous, null, 2)}

Responde SOLO con este JSON exacto (sin markdown):
{
  "executive_summary": "2-4 frases densas, con números, como un CFO al dueño. Empieza con 'En este período...' o similar.",
  "kpis": {
    "total_income":      número,
    "total_expenses":    número,
    "net_margin":        número_income_menos_expense,
    "burn_rate":         número_burn_mensual_proyectado_si_hay_quema_o_0,
    "runway_months":     número_o_null_si_no_hay_burn,
    "income_delta_pct":  variación_porcentual_vs_anterior,
    "expense_delta_pct": variación_porcentual_vs_anterior
  },
  "trends": [
    { "category": "...", "current": número, "previous": número, "delta_pct": número }
    // top 5 categorías de gasto o ingreso por magnitud de cambio
  ],
  "top_income_sources": [ { "name": "...", "amount": número } ],  // top 3
  "top_expenses":       [ { "name": "...", "amount": número } ],  // top 3
  "alerts": [
    { "severity": "info|warning|danger", "message": "texto concreto con números" }
  ],
  "recommendations": [
    "Acción 1 concreta, con nombres propios del negocio si aparecen en las transacciones",
    "Acción 2 concreta",
    "Acción 3 concreta"
  ],
  "projection_30d": {
    "expected_income":   número,
    "expected_expenses": número,
    "expected_net":      número,
    "notes":             "cómo se calculó, con 1 frase"
  },
  "currency": "${args.profile.currency}"
}

REGLAS DE CÁLCULO:
- burn_rate: si total_expenses > total_income, extrapolar (total_expenses - total_income) a un mes (30 días). Si no hay burn, 0.
- runway_months: saldo_de_caja / burn_rate (redondeado a 1 decimal). Si burn_rate es 0, null.
- Alertas obligatorias si aplican:
   * runway < 3 meses → severity "danger"
   * gastos crecen más rápido que ingresos (en %) → severity "warning"
   * cualquier categoría con crecimiento de gasto > 50% → severity "warning"
- Exactamente 3 recomendaciones. Nombres concretos si aparecen en los tops.
- Proyección 30d: usa la tendencia del período actual, anualizada a 30 días.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  const jsonStr = text
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  const parsed = JSON.parse(jsonStr) as ReportContent

  // Defensive normalization
  parsed.currency = args.profile.currency
  parsed.recommendations = (parsed.recommendations ?? []).slice(0, 3)
  parsed.top_income_sources = (parsed.top_income_sources ?? []).slice(0, 3)
  parsed.top_expenses       = (parsed.top_expenses       ?? []).slice(0, 3)
  parsed.trends             = (parsed.trends             ?? []).slice(0, 6)
  parsed.alerts             = parsed.alerts             ?? []

  return parsed
}
