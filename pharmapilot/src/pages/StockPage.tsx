import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView, EmptyState } from '@/components/common/states'
import { StockStatusBadge } from '@/components/common/StatusPill'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePreferences } from '@/contexts/PreferencesContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'
import type { StockItem, StockStatus } from '@/data/types'
import { LOW_STOCK_DAYS, OVERSTOCK_DAYS } from '@/data/rules'

const STATUSES: StockStatus[] = ['stockout', 'low', 'ok', 'overstock']

function StockTable({ items }: { items: StockItem[] }) {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const [filter, setFilter] = useState<'all' | StockStatus>('all')
  const [q, setQ] = useState('')
  const rows = useMemo(
    () =>
      items
        .filter((i) => (filter === 'all' ? true : i.status === filter))
        .filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.coverageDays - b.coverageDays),
    [items, filter, q],
  )
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])), [items])

  return (
    <>
      <div className="flex flex-col gap-3 px-5 pb-4 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">
              {t('common.all')} <span className="tabular ml-1.5 text-xs text-muted-foreground">{items.length}</span>
            </TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {t(`stock.statuses.${s}`)} <span className="tabular ml-1.5 text-xs text-muted-foreground">{counts[s]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('stock.filterPlaceholder')} className="pl-9" aria-label={t('common.search')} />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('common.noData')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.product')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('common.category')}</TableHead>
              <TableHead className="text-right">{t('stock.onHand')}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">{t('stock.dailySales')}</TableHead>
              <TableHead className="text-right">{t('stock.coverage')}</TableHead>
              <TableHead className="hidden text-right md:table-cell">{t('stock.value')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('stock.expiry')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.productId}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{t(`categories.${i.category}`)}</TableCell>
                <TableCell className="tabular text-right">{fmt.number(i.onHand)}</TableCell>
                <TableCell className="tabular hidden text-right sm:table-cell">{fmt.number(i.avgDailySales)}</TableCell>
                <TableCell className="tabular text-right">{i.coverageDays >= 999 ? '—' : t('common.days', { count: Math.round(i.coverageDays) })}</TableCell>
                <TableCell className="tabular hidden text-right md:table-cell">{fmt.money(i.stockValue)}</TableCell>
                <TableCell className="tabular hidden text-muted-foreground md:table-cell">{i.nearestExpiry ? fmt.date(i.nearestExpiry, { month: 'short', year: 'numeric' }) : '—'}</TableCell>
                <TableCell>
                  <StockStatusBadge status={i.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

export default function StockPage() {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const stock = usePharmacyData((r, id) => r.getStock(id))

  return (
    <>
      <PageHeader title={t('stock.title')} subtitle={t('stock.subtitle')} badge={<DemoBadge />} />
      <DataView state={stock}>
        {(items) => {
          const withSales = items.filter((i) => i.avgDailySales > 0 && i.onHand > 0)
          const coverage = withSales.reduce((s, i) => s + Math.min(i.coverageDays, 180), 0) / Math.max(1, withSales.length)
          const n = (s: StockStatus) => items.filter((i) => i.status === s).length
          return (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <KpiCard label={t('kpi.stockValue')} value={fmt.money(items.reduce((s, i) => s + i.stockValue, 0), { compact: true })} hint={t('kpi.atCost')} />
                <KpiCard label={t('kpi.stockouts')} value={fmt.number(n('stockout'))} hint={t('kpi.products', { count: n('stockout') })} />
                <KpiCard label={t('kpi.lowStock')} value={fmt.number(n('low'))} hint={t('kpi.products', { count: n('low') })} />
                <KpiCard label={t('kpi.overstock')} value={fmt.number(n('overstock'))} hint={t('kpi.products', { count: n('overstock') })} />
                <KpiCard label={t('kpi.coverage')} value={t('common.days', { count: Math.round(coverage) })} />
              </div>
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{t('stock.title')}</CardTitle>
                  <CardDescription>{t('stock.rules', { low: LOW_STOCK_DAYS, over: OVERSTOCK_DAYS })}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-2">
                  <StockTable items={items} />
                </CardContent>
              </Card>
            </>
          )
        }}
      </DataView>
    </>
  )
}
