import { useTranslation } from 'react-i18next'
import { FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useWorkspace } from '@/contexts/WorkspaceContext'

/** Marqueur visible apposé sur tout bloc affichant des données fictives. */
export function DemoBadge() {
  const { t } = useTranslation()
  const { mode } = useWorkspace()
  if (mode !== 'demo') return null
  return (
    <Badge variant="demo" title={t('mode.demoBanner')}>
      <FlaskConical /> {t('mode.demoData')}
    </Badge>
  )
}
