import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncAllForProfile, syncConnection } from '@/lib/connections/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// /api/sync
//
//   GET  → invocado por Vercel Cron (Authorization: Bearer $CRON_SECRET).
//          Recorre todas las conexiones activas de TODOS los usuarios y sincroniza
//          las que llevan más de minHours sin actualizarse (default 23h, así no
//          queda nadie en el día anterior por desfase de la cron).
//
//   POST → invocado por el usuario desde la UI con su sesión de Clerk.
//          Sincroniza todas SUS conexiones activas. Sin body necesario.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // ?type=transbank&minHours=1  → para la cron horaria de Webpay.
  // Default: diario, todos los tipos.
  const url      = new URL(req.url)
  const typeParam = url.searchParams.get('type')
  const minHours = Number(url.searchParams.get('minHours') ?? '23')
  const cutoffIso = new Date(Date.now() - minHours * 3600 * 1000).toISOString()

  let query = supabase
    .from('connections')
    .select('id, last_sync_at')
    .in('status', ['active', 'error'])
    .or(`last_sync_at.is.null,last_sync_at.lt.${cutoffIso}`)
    .limit(500)

  if (typeParam === 'sii' || typeParam === 'fintoc' || typeParam === 'transbank') {
    query = query.eq('type', typeParam)
  }

  const { data: connections, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const c of connections ?? []) {
    try {
      const out = await syncConnection(supabase, c.id, 'cron')
      results.push({ id: c.id, ok: out.status !== 'error', error: out.error })
    } catch (e) {
      results.push({
        id: c.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    totalConnections: connections?.length ?? 0,
    successCount:     results.filter((r) => r.ok).length,
    errorCount:       results.filter((r) => !r.ok).length,
    results,
  })
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const outcomes = await syncAllForProfile(supabase, profile.id, 'manual')
  return NextResponse.json({ outcomes })
}
