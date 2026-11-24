import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { PeriodTabs } from '@/components/common/PeriodTabs'
import { KpiCard } from '@/components/common/KpiCard'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView, Skeleton } from '@/components/common/states'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { TransactionsChart } from '@/components/charts/TransactionsChart'
import { CategoryBars } from '@/components/charts/CategoryBars'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePreferences } from '@/contexts/PreferencesContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'
import type { PeriodDays } from '@/data/types'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const delta = (a: number, b: number) => (b ? (a - b) / b : 0)

export default function SalesPage() {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const [period, setPeriod] = useState<PeriodDays>(30)
  const kpis = usePharmacyData((r, id) => r.getKpis(id, period), [period])
  const daily = usePharmacyData((r, id) => r.getDailySales(id, period), [period])
  const categories = usePharmacyData((r, id) => r.getCategorySales(id, period), [period])
  const products = usePharmacyData((r, id) => r.getTopProducts(id, period, 50), [period])

  return (
    <>
      <PageHeader
        title={t('sales.title')}
        subtitle={t('sales.subtitle')}
        badge={<DemoBadge />}
        actions={
          <>
            <PeriodTabs value={period} onChange={setPeriod} />
            <Button variant="outline" disabled>
              <Download /> {t('common.export')}
            </Button>
            <IntegrationBadge id="reports_export" />
          </>
        }
      />

      <DataView state={kpis} loading={<Skeleton className="h-[122px]" />}>
        {(k) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label={t('kpi.revenue')} value={fmt.money(k.revenue)} delta={delta(k.revenue, k.revenuePrev)} hint={t('common.vsPrevious')} />
            <KpiCard label={t('kpi.transactions')} value={fmt.number(k.transactions)} delta={delta(k.transactions, k.transactionsPrev)} hint={t('common.vsPrevious')} />
            <KpiCard label={t('kpi.avgBasket')} value={fmt.money(k.avgBasket)} delta={delta(k.avgBasket, k.avgBasketPrev)} hint={t('common.vsPrevious')} />
          </div>
        )}
      </DataView>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('sales.daily')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataView state={daily} compact>
              {(d) => <RevenueChart data={d} height={240} />}
            </DataView>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('sales.transactionsChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataView state={daily} compact>
              {(d) => <TransactionsChart data={d} height={268} />}
            </DataView>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('sales.categoryMargin')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataView state={categories} compact>
            {(c) => <CategoryBars data={c} withMargin />}
          </DataView>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('sales.products')}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <DataView state={products} compact>
            {(rows) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.product')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('common.category')}</TableHead>
                    <TableHead className="text-right">{t('common.quantity')}</TableHead>
                    <TableHead className="text-right">{t('common.revenue')}</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">{t('sales.marginRate')}</TableHead>
                    <TableHead className="text-right">{t('sales.trend')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.productId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{t(`categories.${r.category}`)}</TableCell>
                      <TableCell className="tabular text-right">{fmt.number(r.quantity)}</TableCell>
                      <TableCell className="tabular text-right">{fmt.money(r.revenue)}</TableCell>
                      <TableCell className="tabular hidden text-right sm:table-cell">{fmt.percent(r.marginRate)}</TableCell>
                      <TableCell className={cn('tabular text-right font-medium', r.trend >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                        {fmt.signedPercent(r.trend)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataView>
        </CardContent>
      </Card>
    </>
  )
}
