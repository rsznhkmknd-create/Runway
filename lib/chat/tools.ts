/**
 * Tools the chat agent can invoke. Each tool:
 *   - Has a strict input schema Claude sees (Anthropic JSON Schema dialect).
 *   - Always scopes its DB action by the authenticated `profileId` — Claude
 *     CANNOT pass a profile_id that bleeds into another user's rows.
 *   - Returns a string Claude reads as the tool result + a `receipt` we
 *     surface to the UI (so the user can see "✓ Factura creada para…").
 *
 * Add a new tool by adding to TOOL_DEFINITIONS + TOOL_HANDLERS. The agent
 * loop in /api/chat picks them up automatically.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import type { Database, Json } from '../supabase/types'
import { anthropic } from '../claude'

type SB = SupabaseClient<Database>

export type ToolReceipt = {
  tool: string
  status: 'ok' | 'error' | 'noop'
  summary: string
}

export type ToolHandlerCtx = {
  supabase: SB
  profileId: string
  defaultCurrency: string
}

// ── Tool definitions (the schema Claude sees) ────────────────────────────────

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'add_transaction',
    description:
      'Registra una nueva transacción (ingreso o gasto) en la cuenta del usuario. Úsalo cuando el usuario diga "añade un gasto de X en categoría Y" o "registra un ingreso de Z".',
    input_schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Importe positivo en la moneda del usuario.',
        },
        type: {
          type: 'string',
          enum: ['income', 'expense'],
          description: 'income = ingreso, expense = gasto.',
        },
        category: {
          type: 'string',
          description: 'Categoría corta (1-3 palabras), ej. "Alimentación", "Nómina", "Software".',
        },
        description: {
          type: 'string',
          description: 'Descripción opcional (proveedor, concepto, nota).',
        },
        date: {
          type: 'string',
          description:
            'Fecha en formato YYYY-MM-DD. Si el usuario no la especifica, usa la fecha de hoy.',
        },
      },
      required: ['amount', 'type', 'category', 'date'],
    },
  },
  {
    name: 'create_invoice',
    description:
      'Crea una nueva factura para un cliente. Úsalo cuando el usuario diga "crea una factura para [cliente] por [monto]".',
    input_schema: {
      type: 'object',
      properties: {
        client_name: {
          type: 'string',
          description: 'Nombre del cliente.',
        },
        amount: {
          type: 'number',
          description: 'Importe positivo.',
        },
        due_date: {
          type: 'string',
          description:
            'Fecha de vencimiento YYYY-MM-DD. Si no se especifica, usa 30 días desde hoy.',
        },
        currency: {
          type: 'string',
          description: 'Código ISO 4217 (EUR, USD, MXN…). Por defecto la moneda del usuario.',
        },
      },
      required: ['client_name', 'amount', 'due_date'],
    },
  },
  {
    name: 'mark_invoice_paid',
    description:
      'Marca una factura existente como pagada. Puedes identificarla por id (preferido si lo tienes en el contexto) o por nombre del cliente. Si hay varias coincidencias por cliente, devolverá la lista para que el usuario aclare.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'string',
          description: 'UUID exacto de la factura. Úsalo si está disponible en el contexto.',
        },
        client_name: {
          type: 'string',
          description: 'Nombre del cliente. Se usará si no se proporciona invoice_id.',
        },
      },
    },
  },
  {
    name: 'generate_report',
    description:
      'Genera un reporte financiero (semanal o mensual) y lo guarda. Úsalo cuando el usuario pida un reporte.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['weekly', 'monthly'],
          description: 'Tipo de reporte.',
        },
      },
      required: ['type'],
    },
  },
]

// ── Tool handlers (the actual server-side execution) ────────────────────────

type Handler = (
  input: Record<string, unknown>,
  ctx: ToolHandlerCtx,
  request: Request
) => Promise<{ result: string; receipt: ToolReceipt }>

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function plus30DaysIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/

const HANDLERS: Record<string, Handler> = {
  // ── add_transaction ───────────────────────────────────────────────────
  async add_transaction(input, { supabase, profileId }) {
    const amount = Number(input.amount)
    const type = input.type
    const category = String(input.category ?? '').trim()
    const description = input.description == null ? null : String(input.description).trim()
    const date = isoDate.test(String(input.date)) ? String(input.date) : todayIso()

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        result: 'Error: amount debe ser un número positivo.',
        receipt: { tool: 'add_transaction', status: 'error', summary: 'amount inválido' },
      }
    }
    if (type !== 'income' && type !== 'expense') {
      return {
        result: 'Error: type debe ser "income" o "expense".',
        receipt: { tool: 'add_transaction', status: 'error', summary: 'type inválido' },
      }
    }
    if (!category) {
      return {
        result: 'Error: category es obligatoria.',
        receipt: { tool: 'add_transaction', status: 'error', summary: 'category vacía' },
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('transactions') as any)
      .insert({ profile_id: profileId, amount, type, category, description, date })
      .select('id, amount, type, category, date')
      .single()

    if (error) {
      return {
        result: `Error al guardar la transacción: ${error.message}`,
        receipt: { tool: 'add_transaction', status: 'error', summary: error.message },
      }
    }

    const inserted = data as { id: string; amount: number; type: string; category: string; date: string }
    const summary = `${type === 'income' ? 'Ingreso' : 'Gasto'} de ${amount} en "${category}" el ${date}`
    return {
      result: `OK. Transacción guardada (id ${inserted.id.slice(0, 8)}). ${summary}.`,
      receipt: { tool: 'add_transaction', status: 'ok', summary },
    }
  },

  // ── create_invoice ────────────────────────────────────────────────────
  async create_invoice(input, { supabase, profileId, defaultCurrency }) {
    const client_name = String(input.client_name ?? '').trim()
    const amount = Number(input.amount)
    const due_date = isoDate.test(String(input.due_date)) ? String(input.due_date) : plus30DaysIso()
    const currency = String(input.currency ?? defaultCurrency).toUpperCase()

    if (!client_name) {
      return {
        result: 'Error: client_name es obligatorio.',
        receipt: { tool: 'create_invoice', status: 'error', summary: 'cliente vacío' },
      }
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        result: 'Error: amount debe ser un número positivo.',
        receipt: { tool: 'create_invoice', status: 'error', summary: 'amount inválido' },
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('invoices') as any)
      .insert({
        profile_id: profileId,
        client_name,
        amount,
        currency,
        due_date,
        status: 'pending',
      })
      .select('id, client_name, amount, currency, due_date')
      .single()

    if (error) {
      return {
        result: `Error al crear la factura: ${error.message}`,
        receipt: { tool: 'create_invoice', status: 'error', summary: error.message },
      }
    }

    const created = data as { id: string; client_name: string; amount: number; currency: string; due_date: string }
    const summary = `Factura creada para ${created.client_name} por ${created.amount} ${created.currency} (vence ${created.due_date})`
    return {
      result: `OK. ${summary}. (id ${created.id.slice(0, 8)})`,
      receipt: { tool: 'create_invoice', status: 'ok', summary },
    }
  },

  // ── mark_invoice_paid ─────────────────────────────────────────────────
  async mark_invoice_paid(input, { supabase, profileId }) {
    const invoice_id = input.invoice_id ? String(input.invoice_id) : null
    const client_name = input.client_name ? String(input.client_name).trim() : null

    if (!invoice_id && !client_name) {
      return {
        result: 'Error: necesito invoice_id o client_name.',
        receipt: { tool: 'mark_invoice_paid', status: 'error', summary: 'sin identificador' },
      }
    }

    // ── Path 1: by id (always scoped by profile_id for safety) ──────────
    if (invoice_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('invoices') as any)
        .update({ status: 'paid' })
        .eq('id', invoice_id)
        .eq('profile_id', profileId)
        .select('id, client_name, amount, currency')
        .single()

      if (error || !data) {
        return {
          result: `No encontré la factura ${invoice_id}.`,
          receipt: { tool: 'mark_invoice_paid', status: 'noop', summary: 'no encontrada' },
        }
      }
      const inv = data as { id: string; client_name: string; amount: number; currency: string }
      const summary = `Factura de ${inv.client_name} (${inv.amount} ${inv.currency}) marcada como pagada`
      return {
        result: `OK. ${summary}.`,
        receipt: { tool: 'mark_invoice_paid', status: 'ok', summary },
      }
    }

    // ── Path 2: by client_name — handle ambiguity ───────────────────────
    const { data: matches, error: lookupErr } = await supabase
      .from('invoices')
      .select('id, client_name, amount, currency, due_date, status')
      .eq('profile_id', profileId)
      .ilike('client_name', `%${client_name}%`)
      .in('status', ['pending', 'overdue'])

    if (lookupErr) {
      return {
        result: `Error consultando facturas: ${lookupErr.message}`,
        receipt: { tool: 'mark_invoice_paid', status: 'error', summary: lookupErr.message },
      }
    }
    const found = (matches ?? []) as Array<{
      id: string
      client_name: string
      amount: number
      currency: string
      due_date: string
      status: string
    }>

    if (found.length === 0) {
      return {
        result: `No encontré ninguna factura pendiente o vencida para "${client_name}".`,
        receipt: { tool: 'mark_invoice_paid', status: 'noop', summary: 'sin coincidencias' },
      }
    }
    if (found.length > 1) {
      const list = found
        .map(
          (i) =>
            `  · id ${i.id.slice(0, 8)} · ${i.client_name} · ${i.amount} ${i.currency} · vence ${i.due_date} · ${i.status}`
        )
        .join('\n')
      return {
        result:
          `Hay ${found.length} facturas que coinciden con "${client_name}". Pídele al usuario que aclare ` +
          `cuál marcar como pagada (puedes proponerle elegir por id):\n${list}`,
        receipt: { tool: 'mark_invoice_paid', status: 'noop', summary: `${found.length} coincidencias` },
      }
    }

    // Exactly one match — proceed.
    const target = found[0]!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (supabase.from('invoices') as any)
      .update({ status: 'paid' })
      .eq('id', target.id)
      .eq('profile_id', profileId)
    if (updErr) {
      return {
        result: `Error al actualizar: ${updErr.message}`,
        receipt: { tool: 'mark_invoice_paid', status: 'error', summary: updErr.message },
      }
    }
    const summary = `Factura de ${target.client_name} (${target.amount} ${target.currency}) marcada como pagada`
    return {
      result: `OK. ${summary}.`,
      receipt: { tool: 'mark_invoice_paid', status: 'ok', summary },
    }
  },

  // ── generate_report ───────────────────────────────────────────────────
  // Re-call /api/reports server-side preserving the original cookie so Clerk
  // auth + the existing report-generation pipeline stay the single source of
  // truth (no duplicated business logic).
  async generate_report(input, _ctx, request) {
    const type = input.type === 'weekly' ? 'weekly' : 'monthly'
    const cookie = request.headers.get('cookie') ?? ''
    const origin = new URL(request.url).origin

    let res: Response
    try {
      res = await fetch(`${origin}/api/reports`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ type }),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed'
      return {
        result: `Error invocando /api/reports: ${msg}`,
        receipt: { tool: 'generate_report', status: 'error', summary: msg },
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        result: `El generador de reportes devolvió ${res.status}: ${text.slice(0, 200)}`,
        receipt: { tool: 'generate_report', status: 'error', summary: `HTTP ${res.status}` },
      }
    }

    let body: { id?: string; type?: string; period_start?: string; period_end?: string } = {}
    try {
      body = (await res.json()) as typeof body
    } catch { /* ignore */ }

    const summary = `Reporte ${type} generado${body.period_start ? ` (${body.period_start} → ${body.period_end})` : ''}`
    return {
      result: `OK. ${summary}. (id ${body.id?.slice(0, 8) ?? '???'})`,
      receipt: { tool: 'generate_report', status: 'ok', summary },
    }
  },
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolHandlerCtx,
  request: Request
): Promise<{ result: string; receipt: ToolReceipt }> {
  const handler = HANDLERS[name]
  if (!handler) {
    return {
      result: `Error: tool desconocida "${name}".`,
      receipt: { tool: name, status: 'error', summary: 'tool desconocida' },
    }
  }
  try {
    return await handler(input, ctx, request)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[chat:tools] ${name} threw:`, err)
    return {
      result: `Error inesperado ejecutando ${name}: ${msg}`,
      receipt: { tool: name, status: 'error', summary: msg },
    }
  }
}

// Re-export the SDK so the route doesn't have to import it separately.
export { anthropic }
// Re-export the Json type for clean type-only imports in the route.
export type { Json }
