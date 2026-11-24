import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePreferences } from '@/contexts/PreferencesContext'
import type { DailySales } from '@/data/types'
import { AXIS, SERIES } from './theme'
import { ChartTooltip } from './ChartTooltip'

export function TransactionsChart({ data, height = 220 }: { data: DailySales[]; height?: number }) {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const rows = [{ key: 'transactions', label: t('kpi.transactions'), color: SERIES.primary }]
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={AXIS.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => fmt.date(d, { day: '2-digit', month: 'short' })} tick={AXIS.tick} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={AXIS.tick} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ fill: 'hsl(210 20% 96%)' }}
            content={(p) => <ChartTooltip {...p} rows={rows} formatValue={(v) => fmt.number(v)} formatLabel={(l) => fmt.date(l, { weekday: 'short', day: '2-digit', month: 'short' })} />}
          />
          <Bar dataKey="transactions" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
