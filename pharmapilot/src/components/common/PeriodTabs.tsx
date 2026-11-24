import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PeriodDays } from '@/data/types'

export function PeriodTabs({ value, onChange }: { value: PeriodDays; onChange: (p: PeriodDays) => void }) {
  const { t } = useTranslation()
  return (
    <Tabs value={String(value)} onValueChange={(v) => onChange(Number(v) as PeriodDays)}>
      <TabsList aria-label={t('common.periodLabel')}>
        {[7, 30, 90].map((p) => (
          <TabsTrigger key={p} value={String(p)}>
            {t(`common.period.${p}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
