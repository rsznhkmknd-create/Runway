import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

async function getProfileId(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', userId)
    .single()
  return data?.id ?? null
}

type Params = { params: { id: string } }

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('reports')
    .select('id, type, period_start, period_end, content, created_at')
    .eq('id', params.id)
    .eq('profile_id', profileId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ report: data })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', params.id)
    .eq('profile_id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
