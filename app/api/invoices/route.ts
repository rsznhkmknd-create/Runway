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

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ invoices: [] })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, client_name, amount, currency, due_date, status, created_at')
    .eq('profile_id', profileId)
    .order('due_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data ?? [] })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { client_name, amount, currency, due_date, status } = body as {
    client_name: string
    amount: number
    currency: string
    due_date: string
    status: 'pending' | 'paid' | 'overdue'
  }

  if (!client_name?.trim() || !amount || !due_date) {
    return NextResponse.json(
      { error: 'Faltan campos obligatorios: cliente, importe y fecha de vencimiento' },
      { status: 400 }
    )
  }

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      profile_id: profileId,
      client_name: client_name.trim(),
      amount: Number(amount),
      currency: currency ?? 'EUR',
      due_date,
      status: status ?? 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
