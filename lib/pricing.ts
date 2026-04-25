/**
 * Anthropic API pricing for cost telemetry. Rates per 1M tokens, USD.
 *
 * Source: https://www.anthropic.com/pricing  (sonnet 4.6 — verify on changes)
 *
 * Update these constants if Anthropic publishes new prices and add a comment
 * with the date you verified them. Cost shown to internal dashboards is only
 * as accurate as these numbers — better to over-report than under-report.
 */

// Verified 2026-04-25.
export const SONNET_4_6_INPUT_USD_PER_MTOK = 3
export const SONNET_4_6_OUTPUT_USD_PER_MTOK = 15

export type Usage = {
  input_tokens: number
  output_tokens: number
}

/**
 * Compute the USD cost of a Sonnet 4.6 call from its usage metadata.
 * Returns a number rounded to 6 decimals (matches the numeric(10,6) column
 * type in import_metrics).
 */
export function calculateCost(usage: Usage): number {
  const input = (usage.input_tokens / 1_000_000) * SONNET_4_6_INPUT_USD_PER_MTOK
  const output = (usage.output_tokens / 1_000_000) * SONNET_4_6_OUTPUT_USD_PER_MTOK
  return Math.round((input + output) * 1_000_000) / 1_000_000
}
