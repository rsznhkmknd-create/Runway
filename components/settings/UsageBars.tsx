import { FileUp, Sparkles, FileBarChart } from 'lucide-react'
import type { PlanLimits } from '@/lib/plans'
import type { UsageCounts } from '@/lib/usage'

type Props = {
  usage: UsageCounts
  limits: PlanLimits
}

type Row = {
  icon: typeof FileUp
  label: string
  used: number
  limit: number | null
}

export default function UsageBars({ usage, limits }: Props) {
  const rows: Row[] = [
    { icon: FileUp, label: 'Importaciones', used: usage.imports_count, limit: limits.imports },
    { icon: Sparkles, label: 'Facturas con IA', used: usage.ai_invoices_count, limit: limits.ai_invoices },
    { icon: FileBarChart, label: 'Reportes generados', used: usage.reports_count, limit: limits.reports },
  ]

  return (
    <div className="space-y-4">
      {rows.map(({ icon: Icon, label, used, limit }) => {
        const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null
        return (
          <div key={label}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="w-4 h-4 text-text-muted" />
              <p className="text-sm font-medium text-text-primary flex-1">{label}</p>
              <p className="text-sm tabular-nums text-text-secondary">
                {limit === null ? (
                  <span>
                    {used} <span className="text-text-muted">· sin límite</span>
                  </span>
                ) : (
                  <span>
                    {used} <span className="text-text-muted">/ {limit}</span>
                  </span>
                )}
              </p>
            </div>
            {pct !== null && (
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        )
      })}
      <p className="text-xs text-text-muted pt-1">
        Los contadores se reinician el primer día de cada mes.
      </p>
    </div>
  )
}
