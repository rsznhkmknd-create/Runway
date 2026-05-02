import { DriverNotConfiguredError, type ConnectionDriver } from '@/lib/connections/types'

// ─────────────────────────────────────────────────────────────────────────────
// Fintoc — Open Banking Chile (https://fintoc.com).
//
// IMPLEMENTACIÓN PENDIENTE — requiere las siguientes credenciales reales:
//
//   FINTOC_SECRET_KEY        sk_live_… o sk_test_…
//   NEXT_PUBLIC_FINTOC_PUBLIC_KEY   pk_live_… o pk_test_… (lo usa el widget)
//
// El flujo en producción es:
//   1. El widget devuelve un `link_token` (ya implementado en
//      components/connections/FintocConnectButton).
//   2. Aquí intercambiamos ese link_token por movimientos llamando:
//        GET https://api.fintoc.com/v1/movements
//          Headers: Authorization: <FINTOC_SECRET_KEY>
//                   Fintoc-Link-Token: <link_token>
//          Query:   ?since=<sinceIso>&per_page=300
//   3. Mapeamos cada movimiento a SyncTransaction:
//        external_id = `FINTOC-${movement.id}`
//        type        = movement.amount > 0 ? 'income' : 'expense'
//        amount      = Math.abs(movement.amount)
//        date        = movement.post_date ?? movement.transaction_date
//        description = movement.description
//        category    = inferimos con lib/infer-categories
// ─────────────────────────────────────────────────────────────────────────────

export const fintocLiveDriver: ConnectionDriver = {
  type: 'fintoc',
  mode: 'live',
  async fetch() {
    if (!process.env.FINTOC_SECRET_KEY) {
      throw new DriverNotConfiguredError(
        'Falta FINTOC_SECRET_KEY. ' +
          'Configura las credenciales reales o cambia la conexión a modo sandbox.'
      )
    }
    throw new DriverNotConfiguredError(
      'Driver live de Fintoc todavía no implementado. ' +
        'Cambia esta conexión a modo sandbox o implementa la integración con Fintoc API.'
    )
  },
}
