import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePreferences } from '@/contexts/PreferencesContext'
import type { CategorySales } from '@/data/types'
import { AXIS, SERIES } from './theme'
import { ChartTooltip, Legend, type TooltipRow } from './ChartTooltip'

/** Barres horizontales par famille. Avec withMargin, CA et marge côte à côte (même échelle monétaire). */
export function CategoryBars({ data, withMargin = false }: { data: CategorySales[]; withMargin?: boolean }) {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const rows: TooltipRow[] = [
    { key: 'revenue', label: t('common.revenue'), color: SERIES.primary },
    ...(withMargin ? [{ key: 'margin', label: t('common.margin'), color: SERIES.secondary }] : []),
  ]
  const chartData = data.map((d) => ({ ...d, label: t(`categories.${d.category}`) }))
  const rowH = withMargin ? 40 : 30
  return (
    <div>
      {withMargin && (
        <div className="mb-3">
          <Legend rows={rows} />
        </div>
      )}
      <div style={{ height: Math.max(180, chartData.length * rowH + 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap={withMargin ? 8 : 6}>
            <CartesianGrid stroke={AXIS.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => fmt.number(v, { notation: 'compact' })} tick={AXIS.tick} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tick={AXIS.tick} tickLine={false} axisLine={false} width={128} />
            <Tooltip cursor={{ fill: 'hsl(210 20% 96%)' }} content={(p) => <ChartTooltip {...p} rows={rows} formatValue={(v) => fmt.money(v)} />} />
            <Bar dataKey="revenue" fill={SERIES.primary} radius={[0, 4, 4, 0]} maxBarSize={14} />
            {withMargin && <Bar dataKey="margin" fill={SERIES.secondary} radius={[0, 4, 4, 0]} maxBarSize={14} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
