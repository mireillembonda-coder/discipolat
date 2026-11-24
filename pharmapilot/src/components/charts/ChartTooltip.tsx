import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

export interface TooltipRow {
  key: string
  label: string
  color: string
  dashed?: boolean
}

/** Info-bulle sobre : libellés en encre texte, la couleur n'est portée que par la pastille. */
export function ChartTooltip({
  active,
  payload,
  label,
  rows,
  formatValue,
  formatLabel,
}: TooltipProps<ValueType, NameType> & {
  rows: TooltipRow[]
  formatValue: (v: number) => string
  formatLabel?: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-navy">{formatLabel ? formatLabel(String(label)) : label}</p>
      <ul className="space-y-1">
        {rows.map((r) => {
          const item = payload.find((p) => p.dataKey === r.key)
          if (!item) return null
          return (
            <li key={r.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="inline-block h-0.5 w-3"
                  style={{ background: r.dashed ? `repeating-linear-gradient(90deg, ${r.color} 0 3px, transparent 3px 5px)` : r.color }}
                />
                {r.label}
              </span>
              <span className="tabular font-medium text-foreground">{formatValue(Number(item.value))}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Legend({ rows }: { rows: TooltipRow[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ background: r.dashed ? `repeating-linear-gradient(90deg, ${r.color} 0 3px, transparent 3px 5px)` : r.color }}
          />
          {r.label}
        </li>
      ))}
    </ul>
  )
}
