'use client'

import { useState, useTransition } from 'react'
import { Landmark, FileSpreadsheet, CreditCard, Loader2, RefreshCw, Trash2, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import type { ConnectionType } from '@/lib/supabase/types'
import type { ConnectionMeta } from '@/lib/connections/meta'
import type { ConnectionRow } from './ConnectionsList'
import SiiConnectModal       from './SiiConnectModal'
import FintocConnectButton   from './FintocConnectButton'
import TransbankConnectModal from './TransbankConnectModal'

const ICON: Record<ConnectionType, React.ComponentType<{ className?: string }>> = {
  sii:       FileSpreadsheet,
  fintoc:    Landmark,
  transbank: CreditCard,
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Nunca sincronizado'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1)   return 'Hace unos segundos'
  if (m < 60)  return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Hace ${h} h`
  const d = Math.floor(h / 24)
  return `Hace ${d} d`
}

type Props = {
  row:      ConnectionRow
  meta:     ConnectionMeta
  onChange: (patch: Partial<ConnectionRow>) => void
}

export default function ConnectionCard({ row, meta, onChange }: Props) {
  const Icon = ICON[row.type]
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isConnected = row.id !== null && row.status !== 'disconnected'
  const hasError    = row.status === 'error'

  function handleConnected(updated: ConnectionRow) {
    onChange(updated)
    toast.success(`${meta.name} conectado en modo sandbox`)
    setShowModal(false)
  }

  function handleSync() {
    if (!row.id) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/connections/${row.id}/sync`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error en la sincronización')
        const o = json.outcome
        onChange({
          last_sync_at: new Date().toISOString(),
          last_error:   o.error ?? null,
          status:       o.status === 'error' ? 'error' : 'active',
          records_imported: row.records_imported + (o.recordsImported ?? 0),
        })
        if (o.status === 'error') {
          toast.error(`Error: ${o.error}`)
        } else {
          const reconciled = o.reconciled
            ? ` · ${o.reconciled} factura${o.reconciled === 1 ? '' : 's'} conciliada${o.reconciled === 1 ? '' : 's'}`
            : ''
          toast.success(
            `${o.recordsImported} registro${o.recordsImported === 1 ? '' : 's'} importado${o.recordsImported === 1 ? '' : 's'}${reconciled}`
          )
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error en la sincronización')
      }
    })
  }

  function handleDisconnect() {
    if (!row.id) return
    if (!confirm(`¿Desconectar ${meta.name}? Los datos ya importados se conservan.`)) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/connections/${row.id}`, { method: 'DELETE' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error al desconectar')
        onChange({
          id:           null,
          status:       'disconnected',
          last_sync_at: null,
          last_error:   null,
          records_imported: 0,
        })
        toast.success(`${meta.name} desconectado`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al desconectar')
      }
    })
  }

  function openConnect() {
    if (row.type === 'fintoc') {
      // Fintoc usa un widget/botón — manejado en su propio componente
      return
    }
    setShowModal(true)
  }

  return (
    <>
      <Card className="flex flex-col">
        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-mint" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{meta.name}</p>
                <p className="text-xs text-text-muted">{meta.tagline}</p>
              </div>
            </div>
            {isConnected ? (
              hasError ? (
                <Badge variant="danger" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Error
                </Badge>
              ) : (
                <Badge variant="mint" className="gap-1">
                  <Check className="w-3 h-3" />
                  Conectado
                </Badge>
              )
            ) : (
              <Badge variant="muted">Desconectado</Badge>
            )}
          </div>

          <p className="text-xs text-text-muted mt-3 leading-relaxed flex-1">{meta.description}</p>

          {isConnected && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-text-muted">Última sincronización</p>
                <p className="text-text-primary font-medium mt-0.5">
                  {formatRelative(row.last_sync_at)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Documentos</p>
                <p className="text-text-primary font-medium mt-0.5">
                  {row.records_imported.toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          )}

          {hasError && row.last_error && (
            <p className="mt-3 text-xs text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              {row.last_error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            {isConnected ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSync}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Sincronizar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  aria-label={`Desconectar ${meta.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : row.type === 'fintoc' ? (
              <FintocConnectButton onConnected={handleConnected} />
            ) : (
              <Button size="sm" variant="primary" onClick={openConnect} className="flex-1">
                Conectar {meta.name}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showModal && row.type === 'sii' && (
        <SiiConnectModal onClose={() => setShowModal(false)} onConnected={handleConnected} />
      )}
      {showModal && row.type === 'transbank' && (
        <TransbankConnectModal onClose={() => setShowModal(false)} onConnected={handleConnected} />
      )}
    </>
  )
}
