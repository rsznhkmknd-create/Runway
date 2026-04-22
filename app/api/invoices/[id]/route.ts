import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
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

export async function PATCH(request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const body = await request.json()
  const patch: {
    client_name?: string
    amount?: number
    currency?: string
    due_date?: string
    status?: 'pending' | 'paid' | 'overdue'
  } = {}
  if (typeof body.client_name === 'string') patch.client_name = body.client_name.trim()
  if (body.amount != null) patch.amount = Number(body.amount)
  if (typeof body.currency === 'string') patch.currency = body.currency
  if (typeof body.due_date === 'string') patch.due_date = body.due_date
  if (body.status === 'pending' || body.status === 'paid' || body.status === 'overdue') {
    patch.status = body.status
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', params.id)
    .eq('profile_id', profileId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })

  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', params.id)
    .eq('profile_id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
