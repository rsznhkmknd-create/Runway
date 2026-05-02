import type { ConnectionMode, ConnectionType } from '@/lib/supabase/types'
import type { ConnectionDriver } from './types'
import { getSiiDriver }       from './sii'
import { getFintocDriver }    from './fintoc'
import { getTransbankDriver } from './transbank'

export function getDriver(type: ConnectionType, mode: ConnectionMode): ConnectionDriver {
  switch (type) {
    case 'sii':       return getSiiDriver(mode)
    case 'fintoc':    return getFintocDriver(mode)
    case 'transbank': return getTransbankDriver(mode)
  }
}

// Re-export so existing server-side imports keep working — but client code
// should import directly from './meta' to avoid pulling in the drivers.
export { CONNECTION_META, ALL_CONNECTION_TYPES, type ConnectionMeta } from './meta'
