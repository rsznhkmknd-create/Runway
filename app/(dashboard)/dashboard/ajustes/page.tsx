import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Bell, Shield, CreditCard, ChevronRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import SettingsTabs, { type ProfileData } from '@/components/settings/SettingsTabs'

export const metadata: Metadata = { title: 'Ajustes' }

const SECTIONS = [
  {
    id:          'notificaciones',
    icon:        Bell,
    color:       'bg-amber-50',
    iconColor:   'text-amber-600',
    title:       'Notificaciones',
    description: 'Alertas de runway bajo, facturas vencidas y resúmenes semanales',
  },
  {
    id:          'seguridad',
    icon:        Shield,
    color:       'bg-blue-50',
    iconColor:   'text-blue-600',
    title:       'Seguridad',
    description: 'Contraseña, autenticación en dos pasos y sesiones activas',
  },
  {
    id:          'facturacion',
    icon:        CreditCard,
    color:       'bg-purple-50',
    iconColor:   'text-purple-600',
    title:       'Plan y facturación',
    description: 'Plan actual, límites, historial de pagos y métodos de pago',
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
        <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
        <p className="text-gray-500 mt-1 text-sm">Configura tu cuenta y el perfil de tu empresa</p>
      </div>

      <SettingsTabs initialProfile={initialProfile} email={email} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-gray-900 px-6 pt-5 pb-3">Otras configuraciones</h2>
        <div className="divide-y divide-gray-50">
          {SECTIONS.map(({ id, icon: Icon, color, iconColor, title, description }) => (
            <button
              key={id}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
        <h2 className="font-semibold text-red-600 mb-1">Zona de peligro</h2>
        <p className="text-sm text-gray-500 mb-4">
          Estas acciones son irreversibles. Procede con cautela.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="text-sm font-medium text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
            Exportar todos mis datos
          </button>
          <button className="text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
            Eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  )
}
