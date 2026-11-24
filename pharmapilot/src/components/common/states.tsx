import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertTriangle, PlugZap, Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IntegrationBadge } from './IntegrationBadge'
import type { DataState } from '@/hooks/usePharmacyData'
import type { IntegrationId } from '@/lib/integrations'
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function EmptyState({ icon, title, body, children }: { icon?: ReactNode; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <p className="font-medium text-navy">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

/** État affiché quand une vue n'est pas encore alimentée par un service réel. */
export function NotConnectedState({ integration, compact }: { integration: IntegrationId; compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className={cn('flex flex-col items-center text-center', compact ? 'p-6' : 'p-10')}>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <PlugZap className="h-5 w-5" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="font-medium text-navy">{t('integration.notConnectedTitle')}</p>
          <IntegrationBadge id={integration} />
        </div>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{t(`integrations.${integration}.name`)}</p>
        {!compact && <p className="mt-2 max-w-lg text-sm text-muted-foreground">{t('integration.notConnectedBody')}</p>}
        {!compact && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/importation">{t('integration.goImport')}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ErrorState() {
  const { t } = useTranslation()
  return (
    <Card>
      <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title={t('common.errorTitle')} body={t('common.errorBody')} />
    </Card>
  )
}

/** Rend un DataState : chargement, non connecté, erreur ou contenu. */
export function DataView<T>({
  state,
  children,
  loading,
  compact,
}: {
  state: DataState<T>
  children: (data: T) => ReactNode
  loading?: ReactNode
  compact?: boolean
}) {
  switch (state.status) {
    case 'loading':
    case 'no_pharmacy':
      return <>{loading ?? <Skeleton className="h-48 w-full" />}</>
    case 'not_connected':
      return <NotConnectedState integration={state.integration} compact={compact} />
    case 'error':
      return <ErrorState />
    case 'ready':
      return <>{children(state.data)}</>
  }
}
