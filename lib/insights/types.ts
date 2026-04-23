export type InsightSeverity = 'positive' | 'warning' | 'critical'

export type Insight = {
  severity: InsightSeverity
  message:  string
}

export type DailyInsightsPayload = {
  insights: Insight[]
}

export type DailyInsightsRow = {
  id:         string
  date:       string
  insights:   Insight[]
  created_at: string
}
