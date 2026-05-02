import { DriverNotConfiguredError, type ConnectionDriver } from '@/lib/connections/types'

// ─────────────────────────────────────────────────────────────────────────────
// SII via OpenFactura (https://www.openfactura.cl/) — proveedor recomendado.
//
// IMPLEMENTACIÓN PENDIENTE — requiere las siguientes credenciales reales:
//
//   OPENFACTURA_API_URL   (ej. https://api.haulmer.com/v2)
//   OPENFACTURA_API_KEY   (header: apikey: <KEY>)
//
// Endpoints relevantes (a verificar contra docs vigentes de Haulmer/OpenFactura):
//   POST /dte/document/received   → facturas recibidas
//   POST /dte/document/sent       → facturas emitidas
//   POST /dte/boleta              → boletas electrónicas
//
// Cada respuesta debe mapearse a SyncInvoice con:
//   external_id  = `SII-${TipoDTE}-${Folio}-${RutEmisor}`
//   invoice_kind = issued | received | boleta
//   status       = pending si MntTotal > MntPagado; paid en otro caso
//
// La "Clave Tributaria" del usuario NO se usa con OpenFactura — el proveedor
// firma con su propio certificado y nosotros sólo guardamos el RUT del
// contribuyente en metadata.rut.
// ─────────────────────────────────────────────────────────────────────────────

export const siiLiveDriver: ConnectionDriver = {
  type: 'sii',
  mode: 'live',
  async fetch() {
    if (!process.env.OPENFACTURA_API_KEY || !process.env.OPENFACTURA_API_URL) {
      throw new DriverNotConfiguredError(
        'Faltan OPENFACTURA_API_URL y OPENFACTURA_API_KEY. ' +
          'Configura las credenciales reales o cambia la conexión a modo sandbox.'
      )
    }
    throw new DriverNotConfiguredError(
      'Driver live del SII todavía no implementado. ' +
        'Cambia esta conexión a modo sandbox o implementa la integración con OpenFactura.'
    )
  },
}
