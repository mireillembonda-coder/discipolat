import { useTranslation } from 'react-i18next'
import { CalendarRange, FileSpreadsheet, Layers, PackageSearch, PieChart, Truck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView } from '@/components/common/states'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePreferences } from '@/contexts/PreferencesContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'

const TEMPLATES = [
  { id: 'monthly', icon: CalendarRange },
  { id: 'abc', icon: Layers },
  { id: 'rotation', icon: PackageSearch },
  { id: 'expiry', icon: FileSpreadsheet },
  { id: 'suppliers', icon: Truck },
  { id: 'margins', icon: PieChart },
] as const

export default function ReportsPage() {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const abc = usePharmacyData((r, id) => r.getAbcAnalysis(id, 30))

  return (
    <>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} actions={<IntegrationBadge id="reports_export" />} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map(({ id, icon: Icon }) => (
          <Card key={id} className="flex flex-col">
            <CardHeader>
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <CardTitle>{t(`reports.templates.${id}.name`)}</CardTitle>
              <CardDescription>{t(`reports.templates.${id}.desc`)}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled>
                {t('reports.generate')}
              </Button>
              <span className="text-xs text-muted-foreground">PDF · Excel</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t('reports.abcPreview')}</CardTitle>
            <DemoBadge />
          </div>
          <CardDescription>{t('reports.abcPreviewDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <DataView state={abc} compact>
            {(rows) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.product')}</TableHead>
                    <TableHead className="text-right">{t('common.revenue')}</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">{t('reports.cumulative')}</TableHead>
                    <TableHead className="text-right">{t('reports.class')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.productId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="tabular text-right">{fmt.money(r.revenue)}</TableCell>
                      <TableCell className="tabular hidden text-right sm:table-cell">{fmt.percent(r.cumulativeShare)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.abcClass === 'A' ? 'success' : r.abcClass === 'B' ? 'info' : 'outline'}>{r.abcClass}</Badge>
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
