import type { Metadata } from 'next'
import { currentUser } from '@clerk/nextjs/server'
import { Building2, Bell, Shield, CreditCard, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function AjustesPage() {
  const user = await currentUser()

  const sections = [
    {
      id: 'empresa',
      icon: Building2,
      color: 'bg-brand-50',
      iconColor: 'text-brand-600',
      title: 'Empresa',
      description: 'Nombre, moneda, zona horaria y datos fiscales',
    },
    {
      id: 'notificaciones',
      icon: Bell,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
      title: 'Notificaciones',
      description: 'Alertas de runway bajo, facturas vencidas y resúmenes semanales',
    },
    {
      id: 'seguridad',
      icon: Shield,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      title: 'Seguridad',
      description: 'Contraseña, autenticación en dos pasos y sesiones activas',
    },
    {
      id: 'facturacion',
      icon: CreditCard,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      title: 'Plan y facturación',
      description: 'Plan actual, límites, historial de pagos y métodos de pago',
    },
  ]

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
        <p className="text-gray-500 mt-1 text-sm">Configura tu cuenta y preferencias</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Perfil</h2>
        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 font-bold text-xl">
                {user?.firstName?.[0] ?? '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Sin nombre'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {user?.emailAddresses?.[0]?.emailAddress ?? '—'}
            </p>
          </div>
          <button className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors shrink-0">
            Editar
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Nombre</label>
            <input
              type="text"
              defaultValue={user?.firstName ?? ''}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Apellido</label>
            <input
              type="text"
              defaultValue={user?.lastName ?? ''}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Email</label>
            <input
              type="email"
              defaultValue={user?.emailAddresses?.[0]?.emailAddress ?? ''}
              disabled
              className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Moneda</label>
            <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50">
              <option value="EUR">EUR — Euro</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="ARS">ARS — Peso argentino</option>
              <option value="USD">USD — Dólar americano</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Zona horaria</label>
            <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50">
              <option>Europe/Madrid</option>
              <option>America/Mexico_City</option>
              <option>America/Bogota</option>
              <option>America/Buenos_Aires</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Section links */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-gray-900 px-6 pt-5 pb-3">Configuración</h2>
        <div className="divide-y divide-gray-50">
          {sections.map(({ id, icon: Icon, color, iconColor, title, description }) => (
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

      {/* Danger zone */}
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
