import type { ConnectionMode } from '@/lib/supabase/types'
import { siiSandboxDriver } from './driver-sandbox'
import { siiLiveDriver }    from './driver-live'

export function getSiiDriver(mode: ConnectionMode) {
  return mode === 'live' ? siiLiveDriver : siiSandboxDriver
}
