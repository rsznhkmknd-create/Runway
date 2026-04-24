export type ReportType = 'weekly' | 'monthly'

export type ReportAlert = {
  severity: 'info' | 'warning' | 'danger'
  message: string
}

export type ReportTrend = {
  category: string
  current: number
  previous: number
  delta_pct: number
}

export type ReportKpis = {
  total_income:       number
  total_expenses:     number
  net_margin:         number
  burn_rate:          number              // monthly burn (expenses - income) if positive
  runway_months:      number | null       // null when infinite (non-burning)
  income_delta_pct:   number              // vs previous period
  expense_delta_pct:  number
}

export type ReportContent = {
  executive_summary:   string
  kpis:                ReportKpis
  trends:              ReportTrend[]
  top_income_sources:  { name: string; amount: number }[]
  top_expenses:        { name: string; amount: number }[]
  alerts:              ReportAlert[]
  recommendations:     string[]
  projection_30d: {
    expected_income:   number
    expected_expenses: number
    expected_net:      number
    notes:             string
  }
  currency:            string
  // Snapshot del perfil al momento de generar el reporte. Se persisten aquí
  // para que el encabezado siga mostrando datos coherentes aunque el perfil
  // cambie más tarde.
  company_name?:       string | null
  logo_url?:           string | null
  industry?:           string | null
  country?:            string | null
}

export type ReportRow = {
  id:           string
  type:         ReportType
  period_start: string
  period_end:   string
  content:      ReportContent
  created_at:   string
}
