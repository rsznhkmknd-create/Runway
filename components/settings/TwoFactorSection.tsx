'use client'

import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'

type State = {
  totpEnabled: boolean
  backupCodeEnabled: boolean
  twoFactorEnabled: boolean
}

const PORTAL_URL =
  process.env.NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_URL ??
  'https://accounts.finsight.app/user/security'

export default function TwoFactorSection() {
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const s = await fetchJson<State>('/api/settings/2fa')
        setState(s)
      } catch (err) {
        setError(err instanceof FetchJsonError ? err.message : 'No se pudo leer el estado 2FA')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const active = state?.twoFactorEnabled ?? false

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              active ? 'bg-brand-50 text-brand-600' : 'bg-surface-2 text-text-muted'
            }`}
          >
            {active ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Autenticación en dos pasos (2FA)
            </h2>
            <p className="text-xs text-text-muted mt-0.5 max-w-md">
              Añade una capa extra de seguridad a tu cuenta con una app TOTP (Google Authenticator,
              1Password, etc.).
            </p>
            <div className="mt-2">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Comprobando estado…
                </span>
              ) : error ? (
                <span className="text-xs text-red-600">{error}</span>
              ) : active ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  No configurado
                </span>
              )}
            </div>
          </div>
        </div>

        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {active ? 'Gestionar 2FA' : 'Activar 2FA'}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
