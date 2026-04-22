'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function updateProfile(
  formData: FormData
): Promise<{ success?: true; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'No autorizado' }

  const company_name = (formData.get('company_name') as string | null)?.trim() || null
  const currency     = (formData.get('currency') as string) || 'EUR'

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ company_name, currency, updated_at: new Date().toISOString() })
    .eq('clerk_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/ajustes')
  return { success: true }
}
