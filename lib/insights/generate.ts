import { anthropic } from '@/lib/claude'
import type { DailyInsightsPayload, Insight, InsightSeverity } from './types'

export type FinancialContext = {
  currency:             string
  company_name:         string | null
  cash_balance:         number
  runway_months:        number | null
  burn_rate_monthly:    number
  burn_rate_trend_pct:  number   // + worse, - better
  income_this_month:    number
  income_prev_month:    number
  income_delta_pct:     number
  expenses_this_month:  number
  expenses_prev_month:  number
  expense_delta_pct:    number
  pending_invoices_total:  number
  pending_invoices_count:  number
  overdue_invoices_total:  number
  overdue_invoices_count:  number
  transactions_count:   number
}

const SYSTEM_PROMPT = `Eres el CFO fraccional de esta empresa. No un asistente genérico, no un bot — su CFO.

Reglas absolutas:
- Habla en primera persona del plural ("vemos que...", "nuestro burn rate...", "debemos...").
- Cada insight DEBE incluir un número concreto del negocio (porcentaje, €, semanas, meses).
- Cada insight DEBE terminar con una acción recomendada específica y accionable.
- Máximo 2 frases por insight. Densos, directos, sin preámbulo.
- NUNCA uses palabras genéricas de IA: "análisis", "observamos", "monitorear", "optimizar", "importante notar", "cabe destacar".
- Si los datos muestran un problema, dilo sin suavizar.
- Si los datos son positivos, reconócelo sin exagerar.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. Sin markdown, sin prefacios, sin backticks.`

function buildUserPrompt(ctx: FinancialContext): string {
  return `Genera EXACTAMENTE 3 insights para el dashboard financiero de hoy.

DATOS DE LA EMPRESA:
${JSON.stringify(ctx, null, 2)}

Responde SOLO con este JSON (sin markdown):
{
  "insights": [
    { "severity": "positive|warning|critical", "message": "Frase 1 con número concreto. Acción específica." },
    { "severity": "positive|warning|critical", "message": "Frase 2 con número concreto. Acción específica." },
    { "severity": "positive|warning|critical", "message": "Frase 3 con número concreto. Acción específica." }
  ]
}

CRITERIOS DE SEVERIDAD:
- "critical": runway < 3 meses, facturas vencidas altas, gastos creciendo >30% MoM, caja en rojo.
- "warning":  runway 3-6 meses, gastos subiendo 10-30%, facturas pendientes relevantes, tendencias a vigilar.
- "positive": burn bajando, ingresos subiendo, runway creciendo, cobros al día.

EJEMPLOS DEL TONO EXACTO (imita esta voz, no copies literalmente):
- "Nuestro burn bajó un 18% vs el mes pasado — mantener esta disciplina nos suma 2 meses extra de runway. Revisemos este viernes qué cortes sostener."
- "Tenemos €3.200 en facturas vencidas. Cobrarlas esta semana añade 2 semanas a nuestro runway — llamar hoy a los 3 clientes más grandes."
- "Los ingresos crecieron 22% este mes. Si sostenemos el ritmo alcanzamos break-even en 3 meses — prioricemos el pipeline comercial sobre nuevas contrataciones."

NO SIRVE:
- "Es importante observar que los gastos han aumentado..."
- "Se recomienda monitorear la situación financiera..."
- "Considerar optimizar los procesos de cobro..."

Los 3 insights deben cubrir ángulos DISTINTOS (no 3 insights sobre el mismo tema). Prioriza lo más relevante dado los datos.`
}

function normalizeSeverity(raw: unknown): InsightSeverity {
  if (raw === 'positive' || raw === 'warning' || raw === 'critical') return raw
  return 'warning'
}

export async function generateDailyInsights(
  ctx: FinancialContext
): Promise<DailyInsightsPayload> {
  const userPrompt = buildUserPrompt(ctx)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
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

  let parsed: { insights?: unknown }
  try {
    parsed = JSON.parse(jsonStr) as { insights?: unknown }
  } catch (err) {
    console.error('[insights/generate] JSON parse error:', err, 'response:', text.slice(0, 500))
    throw new Error('La respuesta del modelo no es JSON válido.')
  }

  const raw = Array.isArray(parsed.insights) ? parsed.insights : []
  const insights: Insight[] = raw
    .slice(0, 3)
    .map((it) => {
      const item = it as { severity?: unknown; message?: unknown }
      return {
        severity: normalizeSeverity(item.severity),
        message:  typeof item.message === 'string' ? item.message.trim() : '',
      }
    })
    .filter((i) => i.message.length > 0)

  return { insights }
}
