import { z } from 'zod'

export const notificationSettingsSchema = z
  .object({
    runway_low: z.boolean(),
    invoices_overdue: z.boolean(),
    weekly_summary: z.boolean(),
    monthly_summary: z.boolean(),
    expense_spike: z.boolean(),
  })
  .strict()

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>

export const accountDeleteSchema = z
  .object({
    confirmation: z.literal('ELIMINAR'),
  })
  .strict()

export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>
