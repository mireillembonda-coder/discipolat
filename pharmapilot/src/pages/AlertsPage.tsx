import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertOctagon, BellRing, CalendarClock, PackageX, PackagePlus, TrendingDown, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView, EmptyState } from '@/components/common/states'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { SeverityBadge } from '@/components/common/StatusPill'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePharmacyData } from '@/hooks/usePharmacyData'
import type { Alert, AlertSeverity, AlertType } from '@/data/types'
import { cn } from '@/lib/utils'

const ICONS: Record<AlertType, typeof PackageX> = {
  stockout: PackageX,
  low_stock: TriangleAlert,
  expiry: CalendarClock,
  overstock: PackagePlus,
  sales_drop: TrendingDown,
}
const TONE: Record<AlertSeverity, string> = {
  critical: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-slate-100 text-slate-600',
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation()
  const [sev, setSev] = useState<'all' | AlertSeverity>('all')
  const list = useMemo(() => alerts.filter((a) => sev === 'all' || a.severity === sev), [alerts, sev])
  const count = (s: AlertSeverity) => alerts.filter((a) => a.severity === s).length
  return (
    <>
      <Tabs value={sev} onValueChange={(v) => setSev(v as typeof sev)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">
            {t('common.all')} <span className="tabular ml-1.5 text-xs text-muted-foreground">{alerts.length}</span>
          </TabsTrigger>
          {(['critical', 'warning', 'info'] as const).map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`alerts.severity.${s}`)} <span className="tabular ml-1.5 text-xs text-muted-foreground">{count(s)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card>
        {list.length === 0 ? (
          <EmptyState icon={<AlertOctagon className="h-5 w-5" />} title={t('alerts.empty')} />
        ) : (
          <ul className="divide-y">
            {list.map((a) => {
              const Icon = ICONS[a.type]
              return (
                <li key={a.id} className="flex items-start gap-4 p-4 sm:px-5">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', TONE[a.severity])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{a.productName}</p>
                      <span className="text-xs text-muted-foreground">· {t(`alerts.types.${a.type}`)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t(`alerts.messages.${a.type}`, a.values)}</p>
                  </div>
                  <SeverityBadge severity={a.severity} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}

export default function AlertsPage() {
  const { t } = useTranslation()
  const alerts = usePharmacyData((r, id) => r.getAlerts(id))
  return (
    <>
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle')}
        badge={<DemoBadge />}
        actions={
          <>
            <Button variant="outline" disabled>
              <BellRing /> {t('alerts.notifications')}
            </Button>
            <IntegrationBadge id="notifications" />
          </>
        }
      />
      <DataView state={alerts}>{(list) => <AlertList alerts={list} />}</DataView>
    </>
  )
}
