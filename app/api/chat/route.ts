import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { aiLimiter } from '@/lib/ratelimit'
import { buildChatContext, renderContextForPrompt } from '@/lib/chat/context'
import {
  TOOL_DEFINITIONS,
  executeTool,
  anthropic,
  type ToolReceipt,
} from '@/lib/chat/tools'
import type Anthropic from '@anthropic-ai/sdk'

// ── Body schema ─────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
})

const BodySchema = z.object({
  // Whole conversation so far (client maintains it in useState).
  messages: z.array(MessageSchema).min(1).max(40),
})

// ── Limits ──────────────────────────────────────────────────────────────────
//
// The agent loop calls Claude → executes any tool_use blocks → calls Claude
// again with the results. Cap at 4 iterations to bound cost + latency. With
// 4 iterations the agent can chain at most ~3 tool calls, which is plenty
// for "create invoice + mark another paid" style multi-step requests.
const MAX_TOOL_ITERATIONS = 4

const SYSTEM_PROMPT_TEMPLATE = (companyName: string) => `Eres el CFO digital de ${companyName}. Tienes acceso a todos sus datos financieros en tiempo real.

Habla en español, sé directo y usa números concretos. Cuando el usuario pida ejecutar una acción (crear factura, marcar pagada, registrar transacción, generar reporte), confírmala antes de ejecutarla diciendo qué vas a hacer y pidiendo su OK — solo invoca la tool tras esa confirmación. Si el usuario ya fue explícito ("crea AHORA una factura para Acme por 1500€"), procede sin pedir confirmación adicional.

Nunca inventes datos. Si no tienes información, dilo claramente. Cuando uses cifras, formatéalas con la moneda del usuario.

Si una tool devuelve múltiples coincidencias o un error, comunícaselo al usuario en lenguaje natural — no le pegues el JSON crudo.`

// ── Route ───────────────────────────────────────────────────────────────────

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

  const supabase = createServiceClient()

  // ── Resolve profile ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_name, currency')
    .eq('clerk_id', userId)
    .single()
  if (!profile?.id) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }
  const profileId = profile.id
  const currency = profile.currency ?? 'EUR'

  // ── Build live context ─────────────────────────────────────────────────
  let contextBlock = ''
  try {
    const ctx = await buildChatContext(supabase, profileId, profile.company_name, currency)
    contextBlock = renderContextForPrompt(ctx)
  } catch (err) {
    console.error('[chat] context build failed:', err)
    contextBlock = 'Datos financieros: (no disponibles ahora mismo).'
  }

  const companyName = profile.company_name?.trim() || 'tu empresa'
  const system = `${SYSTEM_PROMPT_TEMPLATE(companyName)}\n\n${contextBlock}`

  // ── Run the agent loop ─────────────────────────────────────────────────
  // We mutate `messages` in place — appending the assistant's tool_use turns
  // and our tool_result turns until Claude returns an end_turn with text.
  const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const toolReceipts: ToolReceipt[] = []
  let finalText = ''
  let totalUsage = { input_tokens: 0, output_tokens: 0 }

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    let response: Anthropic.Message
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system,
        tools: TOOL_DEFINITIONS,
        messages,
      })
    } catch (err) {
      console.error('[chat] Anthropic call failed:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Error de IA' },
        { status: 502 }
      )
    }

    totalUsage = {
      input_tokens: totalUsage.input_tokens + response.usage.input_tokens,
      output_tokens: totalUsage.output_tokens + response.usage.output_tokens,
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    // Always capture text — final text wins (last iteration's), but partial
    // text in intermediate turns is useful for debugging.
    const textChunk = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    if (textChunk) finalText = textChunk

    // No tool calls → we're done.
    if (toolUseBlocks.length === 0 || response.stop_reason !== 'tool_use') {
      break
    }

    // Append the assistant's full content (text + tool_use blocks together).
    messages.push({ role: 'assistant', content: response.content })

    // Execute each requested tool and build a single user turn with the results.
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of toolUseBlocks) {
      const { result, receipt } = await executeTool(
        block.name,
        (block.input ?? {}) as Record<string, unknown>,
        { supabase, profileId, defaultCurrency: currency },
        req
      )
      toolReceipts.push(receipt)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
        is_error: receipt.status === 'error',
      })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  if (!finalText) {
    finalText =
      'Hice lo que me pediste pero no tengo más para añadir. Si necesitas algo más, dime.'
  }

  return NextResponse.json({
    content: finalText,
    actions: toolReceipts,
    usage: totalUsage,
  })
}, aiLimiter)
