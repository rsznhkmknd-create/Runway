import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { periodsFor } from '@/lib/reports/period'
import { generateReportContent } from '@/lib/reports/generate'
import type { ReportType } from '@/lib/reports/types'

async function getProfile(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, company_name, currency, industry, business_type, country, city')
    .eq('clerk_id', userId)
    .single()
  return data
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profile = await getProfile(userId)
  if (!profile?.id) return NextResponse.json({ reports: [] })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('reports')
    .select('id, type, period_start, period_end, content, created_at')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data ?? [] })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { type?: ReportType }
  const type = body.type
  if (type !== 'weekly' && type !== 'monthly') {
    return NextResponse.json({ error: 'Tipo inválido (weekly | monthly)' }, { status: 400 })
  }

  const profile = await getProfile(userId)
  if (!profile?.id) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const supabase = createServiceClient()
  const { current, previous } = periodsFor(type)

  // Fetch transactions for both periods + current cash balance.
  const [currentRes, previousRes, allRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type, category, description, date')
      .eq('profile_id', profile.id)
      .gte('date', current.start)
      .lte('date', current.end)
      .order('date', { ascending: true }),
    supabase
      .from('transactions')
      .select('amount, type, category, description, date')
      .eq('profile_id', profile.id)
      .gte('date', previous.start)
      .lte('date', previous.end)
      .order('date', { ascending: true }),
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('profile_id', profile.id),
  ])

  if (currentRes.error || previousRes.error || allRes.error) {
    return NextResponse.json(
      {
        error:
          currentRes.error?.message ??
          previousRes.error?.message ??
          allRes.error?.message ??
          'Error al cargar transacciones',
      },
      { status: 500 }
    )
  }

  const currentTx  = (currentRes.data  ?? []).map((t) => ({ ...t, amount: Number(t.amount) }))
  const previousTx = (previousRes.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }))

  if (currentTx.length === 0) {
    return NextResponse.json(
      {
        error:
          'No hay transacciones en el período seleccionado. Importa datos antes de generar un reporte.',
      },
      { status: 422 }
    )
  }

  if (currentTx.length < 5) {
    return NextResponse.json(
      {
        error: `Solo hay ${currentTx.length} transacción${currentTx.length === 1 ? '' : 'es'} en el período. Necesitamos al menos 5 para generar un análisis útil.`,
      },
      { status: 422 }
    )
  }

  const cashBalance = (allRes.data ?? []).reduce(
    (sum, t) => sum + (t.type === 'income' ? 1 : -1) * Number(t.amount),
    0
  )

  let content
  try {
    content = await generateReportContent({
      reportType:    type,
      periodStart:   current.start,
      periodEnd:     current.end,
      previousStart: previous.start,
      previousEnd:   previous.end,
      currentTx,
      previousTx,
      cashBalance,
      profile: {
        company_name:  profile.company_name,
        currency:      profile.currency,
        industry:      profile.industry,
        business_type: profile.business_type,
        country:       profile.country,
        city:          profile.city,
      },
    })
  } catch (err) {
    console.error('[reports] Claude generation failed:', err)
    return NextResponse.json(
      { error: 'No se pudo generar el reporte. Inténtalo de nuevo en un momento.' },
      { status: 502 }
    )
  }

  // The `reports` table isn't in the generated Database types yet, cast to any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase.from('reports') as any)
    .insert({
      profile_id:   profile.id,
      type,
      period_start: current.start,
      period_end:   current.end,
      content,
    })
    .select('id, type, period_start, period_end, content, created_at')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Error al guardar el reporte' },
      { status: 500 }
    )
  }

  return NextResponse.json({ report: inserted }, { status: 201 })
}
