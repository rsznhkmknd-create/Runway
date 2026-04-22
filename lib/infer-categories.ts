import { anthropic } from './claude'

const SYSTEM_PROMPT = `Eres un asistente financiero. Categorizas transacciones con nombres cortos en español.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. Sin explicaciones, sin markdown, sin texto adicional.`

const CATEGORIES_HINT = [
  'Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud',
  'Ocio', 'Ropa', 'Educación', 'Viajes', 'Impuestos', 'Nómina',
  'Ventas', 'Inversiones', 'Comisiones', 'Suscripciones', 'Otros',
]

/**
 * Given a list of transaction descriptions, returns a parallel array of
 * short category labels in Spanish. Used when the imported file does not
 * contain a category column.
 *
 * Batches up to 100 at a time to keep the prompt and response bounded.
 */
export async function inferCategoriesFromDescriptions(
  descriptions: string[]
): Promise<string[]> {
  const out: string[] = new Array(descriptions.length).fill('Otros')
  if (descriptions.length === 0) return out

  const BATCH = 80
  for (let i = 0; i < descriptions.length; i += BATCH) {
    const slice = descriptions.slice(i, i + BATCH)
    const userPrompt = `Asigna a cada descripción una categoría corta (1-2 palabras) en español. Usa preferentemente una de: ${CATEGORIES_HINT.join(', ')}. Si ninguna encaja, inventa una corta.

DESCRIPCIONES (${slice.length}):
${JSON.stringify(slice)}

Responde SOLO con un array JSON del mismo largo (${slice.length}), sin markdown:
["categoría1", "categoría2", ...]`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')

      const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
      const cats = JSON.parse(jsonStr) as unknown
      if (Array.isArray(cats)) {
        for (let j = 0; j < slice.length; j++) {
          const c = cats[j]
          if (typeof c === 'string' && c.trim().length > 0) {
            out[i + j] = c.trim()
          }
        }
      }
    } catch (err) {
      console.error('[infer-categories] batch error:', err)
      // Leave this batch as 'Otros'
    }
  }

  return out
}
