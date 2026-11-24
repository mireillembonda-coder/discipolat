import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, History, Send, CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView, EmptyState } from '@/components/common/states'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePreferences } from '@/contexts/PreferencesContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'
import type { OrderSuggestion } from '@/data/types'
import { TARGET_COVERAGE_DAYS } from '@/data/rules'

function SupplierSummary({ lines }: { lines: OrderSuggestion[] }) {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const groups = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>()
    lines.forEach((l) => {
      const g = m.get(l.supplier) ?? { count: 0, total: 0 }
      g.count += 1
      g.total += l.total
      m.set(l.supplier, g)
    })
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [lines])
  return (
    <ul className="divide-y">
      {groups.map(([supplier, g]) => (
        <li key={supplier} className="flex items-center justify-between gap-3 py-3 first:pt-0">
          <div>
            <p className="text-sm font-medium">{supplier}</p>
            <p className="text-xs text-muted-foreground">{t('orders.lines', { count: g.count })}</p>
          </div>
          <span className="tabular text-sm font-semibold">{fmt.money(g.total)}</span>
        </li>
      ))}
      <li className="flex items-center justify-between gap-3 pt-3">
        <span className="text-sm font-medium text-muted-foreground">{t('common.total')}</span>
        <span className="tabular text-base font-semibold text-navy">{fmt.money(lines.reduce((s, l) => s + l.total, 0))}</span>
      </li>
    </ul>
  )
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const suggestions = usePharmacyData((r, id) => r.getOrderSuggestions(id))

  return (
    <>
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        badge={<DemoBadge />}
        actions={
          <>
            <Button variant="outline" disabled>
              <Download /> {t('common.export')}
            </Button>
            <Button variant="outline" disabled>
              <CheckCheck /> {t('orders.validate')}
            </Button>
            <Button disabled>
              <Send /> {t('orders.sendSupplier')}
            </Button>
            <IntegrationBadge id="supplier_sending" />
          </>
        }
      />
      <DataView state={suggestions}>
        {(lines) =>
          lines.length === 0 ? (
            <Card>
              <EmptyState title={t('orders.empty')} />
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card>
                <CardHeader>
                  <CardTitle>{t('orders.suggestions')}</CardTitle>
                  <CardDescription>{t('orders.suggestionsDesc', { days: TARGET_COVERAGE_DAYS })}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.product')}</TableHead>
                        <TableHead className="hidden 2xl:table-cell">{t('common.supplier')}</TableHead>
                        <TableHead className="text-right">{t('stock.onHand')}</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">{t('stock.dailySales')}</TableHead>
                        <TableHead className="text-right">{t('orders.suggested')}</TableHead>
                        <TableHead className="hidden text-right lg:table-cell">{t('orders.unitCost')}</TableHead>
                        <TableHead className="text-right">{t('common.total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.productId}>
                          <TableCell>
                            <p className="font-medium">{l.name}</p>
                            <Badge variant={l.reason === 'stockout' ? 'destructive' : 'warning'} className="mt-1">
                              {t(`orders.reasons.${l.reason}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground 2xl:table-cell">{l.supplier}</TableCell>
                          <TableCell className="tabular text-right">{fmt.number(l.onHand)}</TableCell>
                          <TableCell className="tabular hidden text-right sm:table-cell">{fmt.number(l.avgDailySales)}</TableCell>
                          <TableCell className="tabular text-right font-semibold">
                            {fmt.number(l.suggestedQty)}
                            <span className="block text-xs font-normal text-muted-foreground">
                              {t('orders.pack')} {l.packSize}
                            </span>
                          </TableCell>
                          <TableCell className="tabular hidden text-right lg:table-cell">{fmt.money(l.unitCost)}</TableCell>
                          <TableCell className="tabular text-right">{fmt.money(l.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('orders.bySupplier')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SupplierSummary lines={lines} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>{t('orders.history')}</CardTitle>
                    <IntegrationBadge id="lgo_connectors" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <History className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{t('orders.historyEmpty')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        }
      </DataView>
    </>
  )
}
