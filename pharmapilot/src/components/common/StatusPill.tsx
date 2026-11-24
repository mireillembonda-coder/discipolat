import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { AlertSeverity, StockStatus } from '@/data/types'

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { t } = useTranslation()
  const variant = status === 'stockout' ? 'destructive' : status === 'low' ? 'warning' : status === 'overstock' ? 'info' : 'success'
  return <Badge variant={variant}>{t(`stock.statuses.${status}`)}</Badge>
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { t } = useTranslation()
  const variant = severity === 'critical' ? 'destructive' : severity === 'warning' ? 'warning' : 'info'
  return <Badge variant={variant}>{t(`alerts.severity.${severity}`)}</Badge>
}
