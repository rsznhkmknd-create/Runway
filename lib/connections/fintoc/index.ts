import type { ConnectionMode } from '@/lib/supabase/types'
import { fintocSandboxDriver } from './driver-sandbox'
import { fintocLiveDriver }    from './driver-live'

export function getFintocDriver(mode: ConnectionMode) {
  return mode === 'live' ? fintocLiveDriver : fintocSandboxDriver
}
