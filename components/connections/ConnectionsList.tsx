'use client'

import { useState } from 'react'
import type { Json, ConnectionType, ConnectionStatus, ConnectionMode } from '@/lib/supabase/types'
import type { ConnectionMeta } from '@/lib/connections/registry'
import ConnectionCard from './ConnectionCard'

export type ConnectionRow = {
  id:               string | null
  type:             ConnectionType
  status:           ConnectionStatus
  mode:             ConnectionMode
  last_sync_at:     string | null
  last_error:       string | null
  records_imported: number
  metadata:         Json
}

type Props = {
  initial: ConnectionRow[]
  meta:    Record<ConnectionType, ConnectionMeta>
}

export default function ConnectionsList({ initial, meta }: Props) {
  const [rows, setRows] = useState<ConnectionRow[]>(initial)

  function patchRow(type: ConnectionType, patch: Partial<ConnectionRow>) {
    setRows((rs) => rs.map((r) => (r.type === type ? { ...r, ...patch } : r)))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map((row) => (
        <ConnectionCard
          key={row.type}
          row={row}
          meta={meta[row.type]}
          onChange={(patch) => patchRow(row.type, patch)}
        />
      ))}
    </div>
  )
}
