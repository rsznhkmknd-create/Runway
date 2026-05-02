import { DriverNotConfiguredError, type ConnectionDriver } from '@/lib/connections/types'

// ─────────────────────────────────────────────────────────────────────────────
// Transbank — Webpay Plus / Onepay (https://transbankdevelopers.cl).
//
// IMPLEMENTACIÓN PENDIENTE — requiere:
//
//   TRANSBANK_COMMERCE_CODE   ej. 597055555532 (sandbox público) o el real
//   TRANSBANK_API_KEY         API key del comercio
//   TRANSBANK_ENV             'integration' | 'production'
//
// Transbank no expone "listar ventas" como REST simple. Hay 2 caminos:
//
//   (a) Webpay Transactions API — `GET /rswebpaytransaction/api/webpay/v1.2/transactions`
//       Filtrar por fecha. Sólo devuelve transacciones autorizadas en ese rango.
//       Mapear cada item a SyncTransaction:
//         external_id = `TBK-${buy_order}-${transaction_date}`
//         amount      = item.amount
//         type        = 'income'
//         category    = 'Ventas POS'
//         description = `Venta tarjeta · ${last4 ? '****' + last4 : ''}`
//         date        = item.transaction_date.slice(0, 10)
//
//   (b) Recibir webhooks de confirmación y persistir en tiempo real (recomendado
//       para "ventas en tiempo real" del requirement). En ese caso este driver
//       sólo hace catch-up: consulta el último día por si perdimos algún webhook.
// ─────────────────────────────────────────────────────────────────────────────

export const transbankLiveDriver: ConnectionDriver = {
  type: 'transbank',
  mode: 'live',
  async fetch() {
    if (!process.env.TRANSBANK_COMMERCE_CODE || !process.env.TRANSBANK_API_KEY) {
      throw new DriverNotConfiguredError(
        'Faltan TRANSBANK_COMMERCE_CODE y TRANSBANK_API_KEY. ' +
          'Configura las credenciales reales o cambia la conexión a modo sandbox.'
      )
    }
    throw new DriverNotConfiguredError(
      'Driver live de Transbank todavía no implementado. ' +
        'Cambia esta conexión a modo sandbox o implementa la integración con Webpay.'
    )
  },
}
