export type AlertSeverity = 'critical' | 'warning' | 'info'

export type Alert = {
  /** Stable, deterministic ID so dismissals survive across refreshes. */
  id:        string
  severity:  AlertSeverity
  title:     string
  message:   string
  /** When this condition was computed (ISO date). */
  computed_at: string
  /** Action CTA to render. */
  action?: {
    label: string
    href:  string
  }
}
