import { z } from 'zod'

/**
 * Schemas for the import pipeline. Replace the previous hand-rolled coercion
 * (`coerceMapping`, `isValidTransaction`). Zod validates AND surfaces the
 * exact field + reason when things fail, so the UI can show targeted errors
 * instead of a single generic "la respuesta del modelo no se pudo interpretar".
 */

// ── Enums (must match the runtime usage in normalize-transactions.ts) ────────

export const TipoMetodoEnum = z.enum([
  'columna_explicita',
  'signo_positivo_es_ingreso',
  'signo_positivo_es_gasto',
  'debito_credito',
  'descripcion_keywords',
])
export type TipoMetodo = z.infer<typeof TipoMetodoEnum>

export const ConfidenceEnum = z.enum(['alto', 'medio', 'bajo'])
export type Confidence = z.infer<typeof ConfidenceEnum>

export const PerColumnConfidenceSchema = z.object({
  fecha: ConfidenceEnum.nullable().optional(),
  concepto: ConfidenceEnum.nullable().optional(),
  monto: ConfidenceEnum.nullable().optional(),
  tipo: ConfidenceEnum.nullable().optional(),
  categoria: ConfidenceEnum.nullable().optional(),
})
export type PerColumnConfidence = z.infer<typeof PerColumnConfidenceSchema>

// Helper: coerce the string "null" (common from Claude) and empty strings to null.
const nullableStr = z
  .preprocess((v) => {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    if (s === '' || s.toLowerCase() === 'null') return null
    return s
  }, z.string().nullable())

const stringArr = z
  .preprocess((v) => (Array.isArray(v) ? v.map(String) : []), z.array(z.string()))

// ── ColumnMappingSchema ──────────────────────────────────────────────────────

/**
 * What we expect back from Claude. `safeParse` this and you get either a
 * valid mapping or a list of zod issues with `.path` pointing at the bad
 * field — we surface those paths in the 400 response so the client can
 * render a precise error instead of generic "AI failed".
 */
export const ColumnMappingSchema = z
  .object({
    fecha: nullableStr,
    concepto: nullableStr,
    monto: nullableStr,
    monto_debito: nullableStr,
    monto_credito: nullableStr,
    tipo: nullableStr,
    tipo_metodo: TipoMetodoEnum,
    tipo_valores_ingreso: stringArr,
    tipo_valores_gasto: stringArr,
    categoria: nullableStr,
    confidence: ConfidenceEnum,
    moneda_detectada: z.string().default('desconocida'),
    notas: z.string().default(''),
    sheet: nullableStr.optional(),
    header_row: z.number().int().positive().optional(),
    per_column_confidence: PerColumnConfidenceSchema.optional(),
    reasoning: z.string().optional(),
  })
  .refine(
    (m) =>
      !!m.monto || (!!m.monto_debito && !!m.monto_credito),
    {
      message:
        'El mapping no tiene columna de monto ni par débito/crédito — no se pueden extraer importes.',
      path: ['monto'],
    }
  )

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>

// ── NormalizedTransactionSchema ──────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const NormalizedTransactionSchema = z.object({
  amount: z
    .number()
    .refine((n) => Number.isFinite(n), { message: 'amount must be finite' }),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'category cannot be empty'),
  description: z.string(),
  date: z.string().regex(ISO_DATE, 'date must be YYYY-MM-DD'),
})

export type NormalizedTransaction = z.infer<typeof NormalizedTransactionSchema>

export const TransactionsArraySchema = z.array(NormalizedTransactionSchema)

// ── ParsedRowSchema ──────────────────────────────────────────────────────────

/**
 * A row post-parse. Keys are either original column names (when headers were
 * detected) or numeric indices-as-strings "0","1",…  when we couldn't confirm
 * a header row (see parse-file.ts — we no longer rename to "Columna 1").
 * Values are always strings (trimmed from the cell's display form).
 */
export const ParsedRowSchema = z.record(z.string(), z.string())
export type ParsedRow = z.infer<typeof ParsedRowSchema>

// ── needsReview ──────────────────────────────────────────────────────────────

export const NeedsReviewReasonEnum = z.enum([
  'amount_unparseable',
  'date_unparseable',
  'missing_description',
  'missing_type_signal',
])
export type NeedsReviewReason = z.infer<typeof NeedsReviewReasonEnum>

export const NeedsReviewRowSchema = z.object({
  rawRow: ParsedRowSchema,
  reason: NeedsReviewReasonEnum,
  suggestedPatch: z
    .object({
      amount: z.number().nullable().optional(),
      type: z.enum(['income', 'expense']).optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      date: z.string().optional(),
    })
    .optional(),
})
export type NeedsReviewRow = z.infer<typeof NeedsReviewRowSchema>

// ── Import request body ──────────────────────────────────────────────────────

export const ImportBodySchema = z.object({
  transactions: TransactionsArraySchema,
  needsReviewApproved: TransactionsArraySchema.optional(),
})
export type ImportBody = z.infer<typeof ImportBodySchema>

// ── Helper: format zod issues for a 400 response body ────────────────────────

export function formatZodIssues(err: z.ZodError): Array<{ path: string; message: string }> {
  return err.issues.map((i) => ({
    path: i.path.join('.') || '(root)',
    message: i.message,
  }))
}
