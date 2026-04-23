'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'
import ImageUploader from './ImageUploader'
import type { ProfileData } from './SettingsTabs'

type Props = {
  initial: ProfileData
  email:   string
  onChange: (next: ProfileData) => void
}

export default function ProfileForm({ initial, email, onChange }: Props) {
  const toast = useToast()
  const [fullName, setFullName] = useState(initial.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const dirty = fullName !== (initial.full_name ?? '')

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const { profile } = await fetchJson<{ profile: ProfileData }>('/api/profile', {
        method:    'PATCH',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({ full_name: fullName.trim() || null }),
        timeoutMs: 15_000,
      })
      onChange(profile)
      toast.success('Perfil actualizado.')
    } catch (err) {
      const message =
        err instanceof FetchJsonError ? err.message : 'No se pudo guardar el perfil'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <ImageUploader
        kind="avatar"
        currentUrl={avatarUrl}
        label="Foto de perfil"
        helper="PNG, JPG, WEBP o GIF — máx. 5 MB"
        onChange={(url) => {
          setAvatarUrl(url)
          onChange({ ...initial, avatar_url: url })
        }}
      />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Nombre completo
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ej. Fernando González"
          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          disabled
          readOnly
          className="w-full px-3.5 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1.5">
          El email se gestiona desde tu cuenta de Clerk.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
