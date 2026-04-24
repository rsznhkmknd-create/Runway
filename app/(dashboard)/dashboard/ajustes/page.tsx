import type { Metadata } from 'next'
import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Bell, Shield, CreditCard, ChevronRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import SettingsTabs, { type ProfileData } from '@/components/settings/SettingsTabs'

export const metadata: Metadata = { title: 'Ajustes' }

const SECTIONS = [
  {
    href:        '/dashboard/ajustes/notificaciones',
    icon:        Bell,
    color:       'bg-amber-50',
    iconColor:   'text-amber-600',
    title:       'Notificaciones',
    description: 'Alertas de runway bajo, facturas vencidas y resúmenes semanales',
  },
  {
    href:        '/dashboard/ajustes/seguridad',
    icon:        Shield,
    color:       'bg-blue-50',
    iconColor:   'text-blue-600',
    title:       'Seguridad',
    description: 'Sesiones activas, 2FA, actividad reciente y exportación de datos',
  },
  {
    href:        '/dashboard/ajustes/plan',
    icon:        CreditCard,
    color:       'bg-purple-50',
    iconColor:   'text-purple-600',
    title:       'Plan y facturación',
    description: 'Plan actual, límites de uso y cambios de plan',
  },
]

export default async function AjustesPage() {
  const { userId } = await auth()
  const user       = await currentUser()
  const supabase   = createServiceClient()

  const email = user?.emailAddresses?.[0]?.emailAddress ?? ''
  const clerkFullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || ''

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, company_name, tax_id, address, city, country, currency, industry, website, logo_url, avatar_url'
    )
    .eq('clerk_id', userId!)
    .single()

  if (error || !profile) {
    throw new Error(
      `No pudimos cargar tu perfil${error?.message ? `: ${error.message}` : ''}.`
    )
  }

  const initialProfile: ProfileData = {
    ...profile,
    full_name:  profile.full_name  ?? clerkFullName ?? null,
    avatar_url: profile.avatar_url ?? user?.imageUrl ?? null,
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Ajustes</h1>
        <p className="text-text-muted mt-1 text-sm">Configura tu cuenta y el perfil de tu empresa</p>
      </div>

      <SettingsTabs initialProfile={initialProfile} email={email} />

      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <h2 className="font-semibold text-text-primary px-6 pt-5 pb-3">Otras configuraciones</h2>
        <div className="divide-y divide-border">
          {SECTIONS.map(({ href, icon: Icon, color, iconColor, title, description }) => (
            <Link
              key={href}
              href={href}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-2 transition-colors text-left"
            >
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="text-xs text-text-muted mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
