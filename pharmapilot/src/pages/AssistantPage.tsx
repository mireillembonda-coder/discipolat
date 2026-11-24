import { useTranslation } from 'react-i18next'
import { Bot, Info, SendHorizontal, Sparkles, User } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'

/**
 * Interface de l'assistant IA. Aucun modèle n'est appelé dans cette version.
 * En démonstration, un échange d'exemple est construit à partir des données fictives
 * (calcul déterministe, sans IA) et explicitement étiqueté comme tel.
 */
function DemoExample() {
  const { t } = useTranslation()
  const { fmt } = usePreferences()
  const stock = usePharmacyData((r, id) => r.getStock(id))
  if (stock.status !== 'ready') return null
  const risky = stock.data.filter((s) => s.status === 'stockout' || s.status === 'low').sort((a, b) => a.coverageDays - b.coverageDays)
  return (
    <div className="space-y-4">
      <Badge variant="demo">{t('assistant.exampleLabel')}</Badge>
      <div className="flex justify-end gap-3">
        <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{t('assistant.exampleQuestion')}</div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
          <Bot className="h-4 w-4 text-accent-foreground" />
        </span>
        <div className="max-w-[85%] rounded-lg rounded-tl-sm border bg-card px-4 py-3 text-sm">
          <p>{t('assistant.exampleAnswer')}</p>
          <ul className="mt-2 space-y-1">
            {risky.map((s) => (
              <li key={s.productId} className="flex justify-between gap-4">
                <span>{s.name}</span>
                <span className="tabular shrink-0 text-muted-foreground">
                  {t('common.days', { count: Math.round(s.coverageDays) })} · {fmt.number(s.onHand)} u.
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const { t } = useTranslation()
  const { mode } = useWorkspace()
  const suggestions = [t('assistant.s1'), t('assistant.s2'), t('assistant.s3'), t('assistant.s4')]

  return (
    <>
      <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} actions={<IntegrationBadge id="ai_assistant" />} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="flex min-h-[520px] flex-col">
          <CardContent className="flex flex-1 flex-col p-4 sm:p-6">
            <div className="mb-4 flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('assistant.disabledNotice')}</p>
            </div>
            <div className="flex-1">
              {mode === 'demo' ? (
                <DemoExample />
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                    <Sparkles className="h-5 w-5 text-accent-foreground" />
                  </span>
                  <p className="max-w-sm text-sm text-muted-foreground">{t('assistant.principles')}</p>
                </div>
              )}
            </div>
            <form className="mt-6 flex items-end gap-2" onSubmit={(e) => e.preventDefault()}>
              <Textarea rows={2} disabled placeholder={t('assistant.placeholder')} className="min-h-[44px] resize-none" />
              <Button type="submit" size="icon" disabled aria-label={t('assistant.send')}>
                <SendHorizontal />
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-medium text-navy">{t('assistant.suggestions')}</p>
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button disabled className="w-full cursor-not-allowed rounded-md border bg-background px-3 py-2.5 text-left text-sm text-muted-foreground">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{t('assistant.principles')}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
