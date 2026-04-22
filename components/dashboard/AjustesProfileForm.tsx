'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { updateProfile } from '@/app/(dashboard)/dashboard/ajustes/actions'

interface Props {
  initialCompanyName: string
  initialCurrency: string
  fullName: string
  email: string
  imageUrl?: string | null
}

export default function AjustesProfileForm({
  initialCompanyName,
  initialCurrency,
  fullName,
  email,
  imageUrl,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSaved(false)
    setError('')

    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-4">Perfil</h2>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 mb-6">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-700 font-bold text-xl">
              {fullName?.[0] ?? '?'}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{fullName || 'Sin nombre'}</p>
          <p className="text-sm text-gray-500 truncate">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Empresa</label>
            <input
              name="company_name"
              type="text"
              defaultValue={initialCompanyName}
              placeholder="Nombre de tu empresa"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Moneda</label>
            <select
              name="currency"
              defaultValue={initialCurrency}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-gray-50"
            >
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Dólar americano</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="ARS">ARS — Peso argentino</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-brand-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Cambios guardados
            </span>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
