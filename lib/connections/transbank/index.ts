import type { ConnectionMode } from '@/lib/supabase/types'
import { transbankSandboxDriver } from './driver-sandbox'
import { transbankLiveDriver }    from './driver-live'

export function getTransbankDriver(mode: ConnectionMode) {
  return mode === 'live' ? transbankLiveDriver : transbankSandboxDriver
}
