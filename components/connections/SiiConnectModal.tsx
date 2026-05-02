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

// Format RUT as e.g. 12.345.678-9 while typing.
function formatRut(value: string): string {
  const cleaned = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (cleaned.length < 2) return cleaned
  const body = cleaned.slice(0, -1)
  const dv   = cleaned.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}

export default function SiiConnectModal({ onClose, onConnected }: Props) {
  const [rut, setRut] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const liveValid    = rut.replace(/[^0-9kK]/g, '').length >= 7 && password.length >= 4
  const canSubmit    = mode === 'sandbox' || liveValid

  function submit() {
    startTransition(async () => {
      try {
        const body = {
          type:        'sii',
          mode,
          credentials: mode === 'live'
            ? { rut: formatRut(rut), password }
            : null,
          metadata:    mode === 'sandbox' ? {} : { rut: formatRut(rut) },
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
      title="Conectar SII"
      subtitle="Importa facturas emitidas, recibidas y boletas electrónicas."
      onClose={onClose}
    >
      <div className="flex gap-2 mb-5">
        <ModePill active={mode === 'sandbox'} onClick={() => setMode('sandbox')}>
          Sandbox
        </ModePill>
        <ModePill active={mode === 'live'} onClick={() => setMode('live')}>
          Real (OpenFactura)
        </ModePill>
      </div>

      {mode === 'sandbox' ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
          <Beaker className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Modo sandbox: cargamos datos simulados (12 facturas emitidas, 18 recibidas,
            8 boletas) para que veas cómo se verá el dashboard cuando conectes tus credenciales reales.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">RUT</label>
            <input
              type="text"
              value={rut}
              onChange={(e) => setRut(formatRut(e.target.value))}
              placeholder="12.345.678-9"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mint/30"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Clave SII
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mint/30"
              autoComplete="new-password"
            />
            <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
              Tu clave se cifra con AES-256-GCM antes de guardarse. Sólo se usa para
              consultar tus documentos vía OpenFactura.
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
