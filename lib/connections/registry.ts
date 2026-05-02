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

// UI metadata, kept server-side so cards stay consistent across client and SSR.
export type ConnectionMeta = {
  type:        ConnectionType
  name:        string
  tagline:     string
  description: string
}

export const CONNECTION_META: Record<ConnectionType, ConnectionMeta> = {
  sii: {
    type:        'sii',
    name:        'SII',
    tagline:     'Servicio de Impuestos Internos',
    description:
      'Importa automáticamente facturas emitidas, recibidas y boletas electrónicas. ' +
      'Cada documento se concilia con tus movimientos bancarios.',
  },
  fintoc: {
    type:        'fintoc',
    name:        'Fintoc',
    tagline:     'Conexión bancaria (Open Banking)',
    description:
      'Conecta tu cuenta de BancoEstado, Santander, BCI, Banco de Chile, Falabella o ' +
      'Scotiabank. Tus credenciales nunca pasan por Finsight — Fintoc las gestiona.',
  },
  transbank: {
    type:        'transbank',
    name:        'Transbank',
    tagline:     'Ventas con tarjeta',
    description:
      'Sincroniza ventas Webpay y Onepay cada hora. Métricas de ticket promedio, ' +
      'ventas por hora y comparación con el día anterior.',
  },
}

export const ALL_CONNECTION_TYPES: ConnectionType[] = ['sii', 'fintoc', 'transbank']
