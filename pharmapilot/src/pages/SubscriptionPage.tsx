import { useTranslation } from 'react-i18next'
import { Check, Receipt, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { EmptyState } from '@/components/common/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'

const PLANS = [
  { id: 'essential', features: ['dashboards', 'alerts'] },
  { id: 'pro', features: ['dashboards', 'alerts', 'orders', 'reports', 'ai'], highlighted: true },
  { id: 'network', features: ['dashboards', 'alerts', 'orders', 'reports', 'ai', 'multi', 'roles'] },
] as const

export default function SubscriptionPage() {
  const { t } = useTranslation()
  const { mode } = useWorkspace()

  return (
    <>
      <PageHeader title={t('subscription.title')} subtitle={t('subscription.subtitle')} actions={<IntegrationBadge id="billing" />} />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('subscription.current')}</p>
            <p className="font-semibold text-navy">{mode === 'demo' ? t('subscription.demoPlan') : t('subscription.noPlan')}</p>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-4 w-4" /> {t('subscription.payment')}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={cn('flex flex-col', 'highlighted' in p && p.highlighted && 'border-primary ring-1 ring-primary')}>
            <CardHeader>
              <CardTitle>{t(`subscription.plans.${p.id}.name`)}</CardTitle>
              <CardDescription>{t(`subscription.plans.${p.id}.desc`)}</CardDescription>
              <div className="pt-3">
                <Badge variant="pending">{t('subscription.priceTbd')}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {t(`subscription.features.${f}`)}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant={'highlighted' in p && p.highlighted ? 'default' : 'outline'} disabled>
                {t('subscription.choose')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('subscription.invoices')}</CardTitle>
        </CardHeader>
        <EmptyState icon={<Receipt className="h-5 w-5" />} title={t('subscription.invoicesEmpty')} />
      </Card>
    </>
  )
}
