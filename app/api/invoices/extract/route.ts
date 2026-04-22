import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { anthropic } from '@/lib/claude'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']

const SYSTEM_PROMPT = `Eres un experto en análisis de facturas. Tu tarea es extraer datos estructurados de la imagen o PDF de una factura.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO. Sin explicaciones, sin markdown, sin texto adicional.`

const USER_PROMPT = `Analiza esta factura y extrae los siguientes datos.

Responde SOLO con este JSON exacto (sin markdown, sin texto extra):
{
  "client_name": "nombre del cliente / emisor / proveedor como aparece en la factura, o null si no se encuentra",
  "amount": número_total_a_pagar_en_formato_decimal_sin_símbolo_moneda_o_null,
  "currency": "EUR|USD|MXN|COP|ARS|CLP|GBP o null",
  "due_date": "YYYY-MM-DD (fecha de vencimiento si existe, o null)",
  "invoice_number": "número de factura tal como aparece, o null",
  "confidence": "alto|medio|bajo"
}

REGLAS:
- amount debe ser un número (no string), con punto como separador decimal. Usa el TOTAL con impuestos incluidos.
- Si no hay fecha de vencimiento explícita, usa la fecha de emisión.
- Si la moneda no es obvia, infiere por el país o el símbolo (€→EUR, $→USD/MXN según contexto).
- confidence "bajo" si la factura es ilegible o faltan campos clave.`

type ExtractedInvoice = {
  client_name: string | null
  amount: number | null
  currency: string | null
  due_date: string | null
  invoice_number: string | null
  confidence: 'alto' | 'medio' | 'bajo'
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 })
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME.includes(mime)) {
    return NextResponse.json(
      { error: 'Formato no soportado. Acepta PDF, PNG, JPG, WEBP o GIF' },
      { status: 400 }
    )
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  // Build the content block: PDFs use "document", images use "image".
  const fileBlock =
    mime === 'application/pdf'
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mime as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
            data: base64,
          },
        }

  let extracted: ExtractedInvoice
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [fileBlock, { type: 'text' as const, text: USER_PROMPT }],
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const jsonStr = text
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    extracted = JSON.parse(jsonStr) as ExtractedInvoice
  } catch (err) {
    console.error('[invoices/extract] Claude error:', err)
    return NextResponse.json(
      {
        error: 'No se pudieron extraer los datos de la factura. Verifica que el archivo es legible.',
      },
      { status: 422 }
    )
  }

  return NextResponse.json({ extracted })
}
