'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import ConnectModalShell from './ConnectModalShell'
import type { ConnectionRow } from './ConnectionsList'

type Props = {
  onConnected: (row: ConnectionRow) => void
}

const FINTOC_PUBLIC_KEY = process.env.NEXT_PUBLIC_FINTOC_PUBLIC_KEY ?? ''

// Loaded lazily on demand — avoids blocking page render when the user
// never opens the Fintoc flow. The script is the official widget host.
function loadFintocScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).Fintoc) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://js.fintoc.com/v1/'
    s.async = true
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error('No se pudo cargar el widget de Fintoc'))
    document.head.appendChild(s)
  })
}

export default function FintocConnectButton({ onConnected }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  function activateSandbox() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'fintoc', mode: 'sandbox' }),
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

  async function openLiveWidget() {
    if (!FINTOC_PUBLIC_KEY) {
      toast.error('Falta NEXT_PUBLIC_FINTOC_PUBLIC_KEY. Usa modo sandbox por ahora.')
      return
    }
    try {
      await loadFintocScript()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Fintoc = (window as any).Fintoc
      const widget = Fintoc.create({
        publicKey: FINTOC_PUBLIC_KEY,
        holderType: 'business',
        product: 'movements',
        country: 'cl',
        webhookUrl: `${window.location.origin}/api/webhooks/fintoc`,
        onSuccess: async (link: { id: string; username: string }) => {
          startTransition(async () => {
            try {
              const res = await fetch('/api/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'fintoc',
                  mode: 'live',
                  credentials: { link_token: link.id },
                  metadata:    { holder: link.username },
                }),
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
        },
        onExit: () => setShowModal(false),
      })
      widget.open()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error en el widget de Fintoc')
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="primary"
        onClick={() => setShowModal(true)}
        className="flex-1"
        disabled={isPending}
      >
        Conectar banco
      </Button>

      {showModal && (
        <ConnectModalShell
          title="Conectar banco con Fintoc"
          subtitle="Tus credenciales bancarias nunca pasan por Finsight."
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div className="text-xs text-text-muted leading-relaxed">
              Bancos soportados: BancoEstado, Santander, BCI, Banco de Chile, Falabella y Scotiabank.
              Fintoc te pedirá las credenciales directamente — Finsight sólo recibe un token
              para leer tus movimientos.
            </div>

            <div className="border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-text-primary">Modo sandbox</p>
              <p className="text-xs text-text-muted">
                Carga ~38 movimientos simulados (transferencias, pagos a proveedores, ventas
                Webpay) para que pruebes el flujo de conciliación.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={activateSandbox}
                disabled={isPending}
                className="w-full mt-2"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Activar sandbox
              </Button>
            </div>

            <div className="border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-text-primary">Conectar de verdad</p>
              <p className="text-xs text-text-muted">
                Abre el widget oficial de Fintoc para conectar tu cuenta bancaria real.
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={openLiveWidget}
                disabled={isPending || !FINTOC_PUBLIC_KEY}
                className="w-full mt-2"
              >
                {FINTOC_PUBLIC_KEY ? 'Abrir widget de Fintoc' : 'Falta NEXT_PUBLIC_FINTOC_PUBLIC_KEY'}
              </Button>
            </div>
          </div>
        </ConnectModalShell>
      )}
    </>
  )
}
