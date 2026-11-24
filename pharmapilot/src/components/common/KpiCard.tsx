import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { usePreferences } from '@/contexts/PreferencesContext'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  invertDelta,
}: {
  label: string
  value: string
  delta?: number
  hint?: string
  icon?: ReactNode
  /** true si une hausse est défavorable */
  invertDelta?: boolean
}) {
  const { fmt } = usePreferences()
  const positive = delta !== undefined && (invertDelta ? delta < 0 : delta >= 0)
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
        </div>
        <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-navy">{value}</p>
        <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 text-xs">
          {delta !== undefined && Number.isFinite(delta) && (
            <span className={cn('tabular inline-flex items-center gap-0.5 font-medium', positive ? 'text-emerald-700' : 'text-red-600')}>
              {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {fmt.signedPercent(delta)}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
