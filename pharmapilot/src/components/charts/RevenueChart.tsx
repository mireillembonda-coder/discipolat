import { useTranslation } from 'react-i18next'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePreferences } from '@/contexts/PreferencesContext'
import type { DailySales } from '@/data/types'
import { AXIS, SERIES } from './theme'
import { ChartTooltip, Legend, type TooltipRow } from './ChartTooltip'

export function RevenueChart({ data, height = 280, showPrevious = true }: { data: DailySales[]; height?: number; showPrevious?: boolean }) {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const rows: TooltipRow[] = [
    { key: 'revenue', label: t('overview.current'), color: SERIES.primary },
    ...(showPrevious ? [{ key: 'revenuePrev', label: t('overview.previous'), color: SERIES.secondary, dashed: true }] : []),
  ]
  const shortDate = (d: string) => fmt.date(d, { day: '2-digit', month: 'short' })
  return (
    <div>
      {showPrevious && (
        <div className="mb-3">
          <Legend rows={rows} />
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={AXIS.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS.tick} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tickFormatter={(v: number) => fmt.number(v, { notation: 'compact' })} tick={AXIS.tick} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ stroke: 'hsl(215 16% 70%)', strokeWidth: 1 }}
              content={(p) => <ChartTooltip {...p} rows={rows} formatValue={(v) => fmt.money(v)} formatLabel={(l) => fmt.date(l, { weekday: 'short', day: '2-digit', month: 'short' })} />}
            />
            {showPrevious && (
              <Line type="monotone" dataKey="revenuePrev" stroke={SERIES.secondary} strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
            )}
            <Line type="monotone" dataKey="revenue" stroke={SERIES.primary} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
