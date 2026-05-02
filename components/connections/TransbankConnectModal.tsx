'use client'

import { useState, useTransition } from 'react'
import { Loader2, Beaker } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import ConnectModalShell from './ConnectModalShell'
import type { ConnectionRow } from './ConnectionsList'

type Props = {
  onClose:     () => void
  onConnected: (row: ConnectionRow) => void
}

export default function TransbankConnectModal({ onClose, onConnected }: Props) {
  const [commerceCode, setCommerceCode] = useState('')
  const [apiKey, setApiKey]             = useState('')
  const [mode, setMode]                 = useState<'sandbox' | 'live'>('sandbox')
  const [isPending, startTransition]    = useTransition()
  const toast = useToast()

  const liveValid = commerceCode.length >= 8 && apiKey.length >= 8
  const canSubmit = mode === 'sandbox' || liveValid

  function submit() {
    startTransition(async () => {
      try {
        const body = {
          type: 'transbank',
          mode,
          credentials: mode === 'live'
            ? { commerce_code: commerceCode, api_key: apiKey }
            : null,
          metadata: mode === 'live' ? { commerce_code: commerceCode } : {},
        }
        const res  = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'No se pudo conectar')

        const c = json.connection
        onConnected({
          id:               c.id,
          type:             c.type,
          status:           c.status,
          mode:             c.mode,
          last_sync_at:     c.last_sync_at,
          last_error:       c.last_error,
          records_imported: c.records_imported ?? 0,
          metadata:         c.metadata ?? {},
        })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo conectar')
      }
    })
  }

  return (
    <ConnectModalShell
      title="Conectar Transbank"
      subtitle="Sincroniza ventas con tarjeta (Webpay) cada hora."
      onClose={onClose}
    >
      <div className="flex gap-2 mb-5">
        <ModePill active={mode === 'sandbox'} onClick={() => setMode('sandbox')}>
          Sandbox
        </ModePill>
        <ModePill active={mode === 'live'} onClick={() => setMode('live')}>
          Real (Webpay)
        </ModePill>
      </div>

      {mode === 'sandbox' ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
          <Beaker className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Modo sandbox: simulamos ~25 ventas con tarjeta por día durante la última
            semana, con horarios y montos realistas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Código de comercio
            </label>
            <input
              type="text"
              value={commerceCode}
              onChange={(e) => setCommerceCode(e.target.value.replace(/\s/g, ''))}
              placeholder="597055555532"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mint/30 font-mono"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mint/30"
              autoComplete="new-password"
            />
            <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
              Obtén tus credenciales en{' '}
              <a
                href="https://transbankdevelopers.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mint hover:underline"
              >
                transbankdevelopers.cl
              </a>
              . Las claves se cifran con AES-256-GCM.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button size="sm" variant="primary" onClick={submit} disabled={!canSubmit || isPending}>
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === 'sandbox' ? 'Activar sandbox' : 'Conectar'}
        </Button>
      </div>
    </ConnectModalShell>
  )
}

function ModePill({
  active,
  onClick,
  children,
}: {
  active:   boolean
  onClick:  () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-mint/10 text-mint border border-mint/30'
          : 'bg-surface-2 text-text-muted border border-border hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}
