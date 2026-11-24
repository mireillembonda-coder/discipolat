import { useTranslation } from 'react-i18next'
import { CircleDashed, CircleCheck, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getIntegration, type IntegrationId, type IntegrationStatus } from '@/lib/integrations'

export function StatusBadge({ status }: { status: IntegrationStatus }) {
  const { t } = useTranslation()
  if (status === 'ready')
    return (
      <Badge variant="success">
        <CircleCheck /> {t('integration.ready')}
      </Badge>
    )
  if (status === 'partial')
    return (
      <Badge variant="info">
        <CircleDot /> {t('integration.partial')}
      </Badge>
    )
  return (
    <Badge variant="pending">
      <CircleDashed /> {t('integration.toConnect')}
    </Badge>
  )
}

/** Badge « À connecter » avec info-bulle décrivant la fonctionnalité concernée. */
export function IntegrationBadge({ id }: { id: IntegrationId }) {
  const { t } = useTranslation()
  const integ = getIntegration(id)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">
          <StatusBadge status={integ.status} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{t(`integrations.${id}.name`)}</p>
        <p className="opacity-80">{t(`integrations.${id}.desc`)}</p>
      </TooltipContent>
    </Tooltip>
  )
}
