/**
 * Contexto sectorial que se inyecta en el prompt de Claude al generar reportes
 * CFO e insights. No pretende ser exhaustivo: son "hints" que orientan al
 * modelo para que sus análisis sean coherentes con la realidad operativa del
 * sector (márgenes típicos, estacionalidad, partidas críticas).
 *
 * Las claves se comparan en minúsculas con startsWith/includes para admitir
 * variaciones ("Restauración", "restauracion", "Hostelería / Restauración").
 */

type SectorHint = {
  label: string
  context: string
}

const SECTOR_HINTS: Array<{ match: string[]; hint: SectorHint }> = [
  {
    match: ['restaura', 'hostel', 'cater', 'food'],
    hint: {
      label: 'Restauración / Hostelería',
      context:
        'Food cost típico 28-35% sobre ventas; margen bruto objetivo 65-72%. Fuerte estacionalidad (fines de semana, festivos, turismo). Partidas críticas: personal (30-35% de ventas), food cost, alquiler, suministros. Sensible a precio materias primas. Evalúa rotación de mesa y ticket medio.',
    },
  },
  {
    match: ['saas', 'software', 'app', 'tecnol', 'startup'],
    hint: {
      label: 'SaaS / Tecnología',
      context:
        'Métricas clave: MRR, ARR, churn, CAC, LTV, burn multiple. Margen bruto objetivo 70-85%. Regla de referencia: runway 12-18 meses saludable, <6 meses crítico. Gastos principales: nóminas (60-70% del total), infra cloud, ventas y marketing. Evalúa tendencia de nuevos ingresos recurrentes vs churn.',
    },
  },
  {
    match: ['consultor', 'servicio profes', 'agencia', 'marketing'],
    hint: {
      label: 'Consultoría / Servicios profesionales',
      context:
        'Ingresos dependientes de horas facturables / proyectos. Margen bruto típico 40-55%. Partidas críticas: nóminas + freelancers, que deben estar directamente correlacionadas con utilización del equipo. Ciclo de cobro largo (30-90 días); vigila DSO. Riesgo: concentración de cliente (>30% en uno solo es alerta).',
    },
  },
  {
    match: ['comer', 'retail', 'tienda', 'ecommerce', 'e-commerce'],
    hint: {
      label: 'Comercio / Retail / E-commerce',
      context:
        'Margen bruto objetivo 40-55% (retail físico) o 30-45% (e-commerce). Rotación de inventario crítica: stock parado es caja muerta. Evalúa days sales inventory (DSI). Coste de adquisición cliente vs margen de contribución. Estacionalidad marcada (Black Friday, Navidad, rebajas).',
    },
  },
  {
    match: ['manufactur', 'industri', 'product'],
    hint: {
      label: 'Industria / Manufactura',
      context:
        'Coste de producción suele ser 60-75% de ventas. Crítico: utilización de capacidad productiva, coste unitario, materias primas. Cobro a clientes B2B suele ser 60-90 días — vigila fondo de maniobra. Inversión recurrente en CAPEX (maquinaria).',
    },
  },
  {
    match: ['construc', 'inmobil', 'real estate'],
    hint: {
      label: 'Construcción / Inmobiliario',
      context:
        'Proyectos con ciclos largos (meses o años) y márgenes finos (8-15%). Crítico: certificaciones vs caja real, hitos de cobro, subcontratas. Riesgo de desviaciones de presupuesto y sobrecostes. Evalúa margen por proyecto, no solo global.',
    },
  },
  {
    match: ['salud', 'clinic', 'medic', 'wellness'],
    hint: {
      label: 'Salud / Clínicas',
      context:
        'Ingresos por paciente con mix privado/mutuas/aseguradoras. Cobro de aseguradoras puede ser 60-120 días. Personal (médicos, enfermería) es la partida dominante. Evalúa tasa de ocupación de consultas y ticket medio por paciente.',
    },
  },
  {
    match: ['educac', 'academia', 'formaci', 'edtech'],
    hint: {
      label: 'Educación / Formación',
      context:
        'Ingresos con estacionalidad escolar (picos en septiembre/enero). Modelos recurrentes (suscripción) vs one-shot (curso). Crítico: tasa de finalización, renovación, CAC. Margen bruto 55-70%. Gasto principal: profesorado.',
    },
  },
  {
    match: ['financ', 'fintech', 'banca', 'inversi'],
    hint: {
      label: 'Financiero / Fintech',
      context:
        'Regulación estricta (sujeto a licencias, capital mínimo, KYC/AML). Ingresos por comisiones, spread o suscripción. Crítico: take rate, volumen procesado, coste por transacción. Gastos de compliance y tecnología relevantes.',
    },
  },
]

const GENERIC_CONTEXT =
  'No hay contexto sectorial específico mapeado para este negocio. Aplica principios generales de análisis financiero: margen bruto, burn rate, runway, concentración de ingresos y calidad de cartera de cobros.'

export function sectorContextFor(industry: string | null | undefined): string {
  if (!industry) return GENERIC_CONTEXT
  const normalized = industry.trim().toLowerCase()
  if (!normalized) return GENERIC_CONTEXT

  for (const { match, hint } of SECTOR_HINTS) {
    if (match.some((m) => normalized.includes(m))) {
      return `Sector ${hint.label}: ${hint.context}`
    }
  }
  return `Sector "${industry}": ${GENERIC_CONTEXT}`
}
