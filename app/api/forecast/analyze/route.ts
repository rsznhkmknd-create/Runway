import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { anthropic } from '@/lib/claude'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'

// ── Body schema ─────────────────────────────────────────────────────────────
//
// We re-validate the forecast on the wire. Client computes the forecast
// locally for the chart, then sends a SUMMARY (not full month-by-month) to
// keep the Claude prompt short — ~$0.005 per analysis.

const ScenarioEnum = z.enum(['conservative', 'realistic', 'optimistic'])

const BodySchema = z.object({
  scenario: ScenarioEnum,
  startingCash: z.number(),
  avgIncome3m: z.number(),
  avgExpense3m: z.number(),
  baselineGrowthRate: z.number(),
  appliedGrowthRate: z.number(),
  totalIncome12m: z.number(),
  totalExpense12m: z.number(),
  cashAtMonth12: z.number(),
  breakEvenMonth: z
    .object({
      month: z.string(),
      label: z.string(),
      monthIndex: z.number(),
    })
    .nullable(),
  /** Currency code (EUR / MXN / USD …) — already in the user's profile but
   *  passed through for prompt convenience. */
  currency: z.string().optional(),
})

const SCENARIO_LABEL: Record<z.infer<typeof ScenarioEnum>, string> = {
  conservative: 'conservador (-20% sobre la tendencia)',
  realistic: 'realista (tendencia actual)',
  optimistic: 'optimista (+20% sobre la tendencia)',
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function buildPrompt(b: z.infer<typeof BodySchema>, companyName: string): string {
  const breakEvenLine = b.breakEvenMonth
    ? `- Break-even: la caja llega a 0 en ${b.breakEvenMonth.label} (mes ${b.breakEvenMonth.monthIndex} del forecast).`
    : `- Break-even: NO se proyecta agotamiento de caja en los próximos 12 meses.`

  return `Empresa: ${companyName}
Moneda: ${b.currency ?? 'EUR'}
Escenario seleccionado: ${SCENARIO_LABEL[b.scenario]}

Métricas base (últimos 3 meses completos):
- Ingreso medio mensual: ${Math.round(b.avgIncome3m).toLocaleString('es-ES')}
- Gasto medio mensual: ${Math.round(b.avgExpense3m).toLocaleString('es-ES')}
- Tasa de crecimiento mensual de ingresos detectada: ${pct(b.baselineGrowthRate)}
- Tasa aplicada con el multiplicador del escenario: ${pct(b.appliedGrowthRate)}
- Caja actual: ${Math.round(b.startingCash).toLocaleString('es-ES')}

Proyección 12 meses (escenario ${b.scenario}):
- Ingresos totales: ${Math.round(b.totalIncome12m).toLocaleString('es-ES')}
- Gastos totales: ${Math.round(b.totalExpense12m).toLocaleString('es-ES')}
- Caja proyectada al final: ${Math.round(b.cashAtMonth12).toLocaleString('es-ES')}
${breakEvenLine}`
}

const SYSTEM_PROMPT = `Eres un CFO senior analizando el forecast a 12 meses de una PYME. Te paso los datos. Genera un análisis de 1 párrafo (4-6 frases) en español:

1. Diagnóstico: qué tendencia ves (crecimiento sano, estancamiento, riesgo de quiebra de caja, etc.). Cita 1-2 cifras concretas.
2. Recomendaciones: 2-3 acciones CONCRETAS y accionables para mejorar el forecast (ej. "renegocia el alquiler que es 30% del gasto fijo", "lanza la campaña de upsell ahora porque el runway alcanza"). Sin generalidades.

Tono directo, profesional, en español. NO uses bullets ni listas — un párrafo natural. NO repitas las cifras en bruto, contextualízalas.`

export const POST = withRateLimit(async (req: Request) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Schema inválido', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // Resolve company name (Claude uses it in the prompt for tone).
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name')
    .eq('clerk_id', userId)
    .single()
  const companyName = profile?.company_name?.trim() || 'la empresa'

  const userPrompt = buildPrompt(parsed.data, companyName)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    return NextResponse.json({
      analysis: text || 'No fue posible generar el análisis.',
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    })
  } catch (err) {
    console.error('[forecast:analyze] Claude failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de IA' },
      { status: 502 }
    )
  }
}, aiLimiter)
