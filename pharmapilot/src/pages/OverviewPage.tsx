import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Boxes, Coins, Percent, ShoppingBasket } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PeriodTabs } from '@/components/common/PeriodTabs'
import { KpiCard } from '@/components/common/KpiCard'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView, Skeleton } from '@/components/common/states'
import { SeverityBadge } from '@/components/common/StatusPill'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { CategoryBars } from '@/components/charts/CategoryBars'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'
import type { PeriodDays } from '@/data/types'

const delta = (a: number, b: number) => (b ? (a - b) / b : 0)

export default function OverviewPage() {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const { current } = useWorkspace()
  const [period, setPeriod] = useState<PeriodDays>(30)

  const kpis = usePharmacyData((r, id) => r.getKpis(id, period), [period])
  const daily = usePharmacyData((r, id) => r.getDailySales(id, period), [period])
  const categories = usePharmacyData((r, id) => r.getCategorySales(id, period), [period])
  const alerts = usePharmacyData((r, id) => r.getAlerts(id))
  const orders = usePharmacyData((r, id) => r.getOrderSuggestions(id))
  const top = usePharmacyData((r, id) => r.getTopProducts(id, period, 5), [period])

  return (
    <>
      <PageHeader
        title={t('overview.title')}
        subtitle={t('overview.subtitle', { name: current?.name ?? '' })}
        badge={<DemoBadge />}
        actions={<PeriodTabs value={period} onChange={setPeriod} />}
      />

      <DataView
        state={kpis}
        loading={
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[122px]" />
            ))}
          </div>
        }
      >
        {(k) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t('kpi.revenue')} value={fmt.money(k.revenue)} delta={delta(k.revenue, k.revenuePrev)} hint={t('common.vsPrevious')} icon={<Coins />} />
            <KpiCard label={t('kpi.avgBasket')} value={fmt.money(k.avgBasket)} delta={delta(k.avgBasket, k.avgBasketPrev)} hint={t('common.vsPrevious')} icon={<ShoppingBasket />} />
            <KpiCard
              label={t('kpi.grossMargin')}
              value={fmt.percent(k.grossMarginRate)}
              hint={`${fmt.number((k.grossMarginRate - k.grossMarginRatePrev) * 100, { signDisplay: 'always', maximumFractionDigits: 1 })} pt ${t('common.vsPrevious')}`}
              icon={<Percent />}
            />
            <KpiCard label={t('kpi.stockValue')} value={fmt.money(k.stockValue)} hint={t('kpi.atCost')} icon={<Boxes />} />
          </div>
        )}
      </DataView>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('overview.revenueChart')}</CardTitle>
            <CardDescription>{t('overview.revenueChartDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataView state={daily} compact loading={<Skeleton className="h-[300px]" />}>
              {(d) => <RevenueChart data={d} />}
            </DataView>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t('overview.priorityAlerts')}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link to="/alertes">
                {t('common.seeAll')} <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DataView state={alerts} compact>
              {(list) =>
                list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('overview.noAlerts')}</p>
                ) : (
                  <ul className="divide-y">
                    {list.slice(0, 6).map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{a.productName}</p>
                          <p className="text-xs text-muted-foreground">{t(`alerts.messages.${a.type}`, a.values)}</p>
                        </div>
                        <SeverityBadge severity={a.severity} />
                      </li>
                    ))}
                  </ul>
                )
              }
            </DataView>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('overview.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataView state={categories} compact>
              {(c) => <CategoryBars data={c.slice(0, 6)} />}
            </DataView>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('overview.topProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataView state={top} compact>
              {(rows) => (
                <ol className="space-y-3">
                  {rows.map((r, i) => (
                    <li key={r.productId} className="flex items-center gap-3">
                      <span className="tabular w-4 text-xs text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{t(`categories.${r.category}`)}</p>
                      </div>
                      <span className="tabular text-sm font-medium">{fmt.money(r.revenue, { compact: true })}</span>
                    </li>
                  ))}
                </ol>
              )}
            </DataView>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('overview.orderSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataView state={orders} compact>
              {(o) => (
                <div>
                  <p className="text-sm text-muted-foreground">{t('overview.orderSummaryBody', { count: o.length })}</p>
                  <p className="mt-4 text-xs text-muted-foreground">{t('overview.orderSummaryAmount')}</p>
                  <p className="tabular text-2xl font-semibold text-navy">{fmt.money(o.reduce((s, l) => s + l.total, 0))}</p>
                  <Button asChild className="mt-5 w-full" variant="outline">
                    <Link to="/commandes">
                      {t('nav.orders')} <ArrowRight />
                    </Link>
                  </Button>
                </div>
              )}
            </DataView>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
