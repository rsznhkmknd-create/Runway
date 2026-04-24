/**
 * Contexto geográfico para enriquecer los prompts de Claude. Datos operativos
 * del país: moneda habitual, régimen de IVA, factura electrónica, ciclo típico
 * de cobro. No son datos fiscales exhaustivos — son hints para que el análisis
 * de la IA resulte familiar y accionable para un lector local.
 */

type CountryHint = {
  label: string
  context: string
}

const COUNTRY_HINTS: Record<string, CountryHint> = {
  espana: {
    label: 'España',
    context:
      'Mercado España. Moneda EUR, IVA general 21% (reducido 10%, superreducido 4%). Modelo 303 trimestral, 390 anual. SII obligatorio para grandes empresas. Ciclo de cobro B2B típico 30-60 días. Referencias: salario medio ~30k€/año; autónomo cuota mínima ~230€/mes.',
  },
  chile: {
    label: 'Chile',
    context:
      'Mercado chileno. Moneda CLP, IVA 19% (tasa única). Factura electrónica obligatoria vía SII. F29 mensual. Ciclo de cobro B2B 30-90 días. Referencias: salario promedio ~800 mil CLP/mes. Dólar y UF como referencias habituales para contratos grandes.',
  },
  mexico: {
    label: 'México',
    context:
      'Mercado mexicano. Moneda MXN, IVA 16% (8% zona frontera norte). CFDI 4.0 obligatorio (timbrado SAT). Régimen fiscal relevante (RIF, PM, PF Act Emp). Ciclo de cobro 30-60 días. Referencias: salario mínimo ~7-10k MXN/mes; salario promedio ~15-25k MXN/mes.',
  },
  colombia: {
    label: 'Colombia',
    context:
      'Mercado colombiano. Moneda COP, IVA 19% (tasas diferenciales 5% y exentos). Facturación electrónica DIAN obligatoria. Retención en la fuente relevante (2.5%-11% según concepto). Ciclo de cobro 30-90 días. Referencias: SMLMV como unidad común en contratos; inflación históricamente alta impacta proyecciones.',
  },
  argentina: {
    label: 'Argentina',
    context:
      'Mercado argentino. Moneda ARS, con alta inflación (históricamente 100%+ anual). IVA 21% (tasas 10.5% y 27%). Factura electrónica AFIP obligatoria. Retenciones varias (IVA, Ganancias, IIBB). Ciclo de cobro habitual 30-60 días pero con fuerte presión por adelantos dado el contexto inflacionario. Considerar ajuste por inflación en proyecciones.',
  },
  otro: {
    label: 'Internacional',
    context:
      'No hay contexto geográfico específico. Evita mencionar regulaciones fiscales concretas; enfoca el análisis en fundamentos (margen, caja, crecimiento).',
  },
}

const GENERIC =
  'No se ha configurado país; evita referencias fiscales específicas y usa la moneda configurada por el usuario como única referencia monetaria.'

export function countryContextFor(country: string | null | undefined): string {
  if (!country) return GENERIC
  const key = country.trim().toLowerCase()
  if (!key) return GENERIC
  const hint = COUNTRY_HINTS[key]
  if (!hint) return `País "${country}": ${GENERIC}`
  return `País ${hint.label}: ${hint.context}`
}
