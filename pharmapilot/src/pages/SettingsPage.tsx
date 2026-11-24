import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/common/PageHeader'
import { IntegrationBadge, StatusBadge } from '@/components/common/IntegrationBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { INTEGRATIONS } from '@/lib/integrations'
import { SUPPORTED_CURRENCIES, SUPPORTED_LOCALES, type LocaleCode } from '@/lib/config'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { locale, setLocale, currency, setCurrency } = usePreferences()
  const { current } = useWorkspace()

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('settings.tabs.general')}</TabsTrigger>
          <TabsTrigger value="pharmacy">{t('settings.tabs.pharmacy')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('settings.tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="integrations">{t('settings.tabs.integrations')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="max-w-2xl">
            <CardContent className="space-y-6 p-5">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <Label>{t('settings.language')}</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as LocaleCode)}>
                  <SelectTrigger className="sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LOCALES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <Label>{t('settings.currency')}</Label>
                <div>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-xs text-muted-foreground">{t('settings.currencyHint')}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.localNote')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacy">
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{current?.name}</CardTitle>
                <IntegrationBadge id="pharmacies" />
              </div>
              <CardDescription>{t('settings.readOnly')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ph-name">{t('settings.pharmacyName')}</Label>
                <Input id="ph-name" value={current?.name ?? ''} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph-city">{t('settings.city')}</Label>
                <Input id="ph-city" value={current?.city ?? ''} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph-country">{t('settings.country')}</Label>
                <Input id="ph-country" value={current?.country ?? ''} readOnly disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t('settings.tabs.notifications')}</CardTitle>
                <IntegrationBadge id="notifications" />
              </div>
            </CardHeader>
            <CardContent className="divide-y">
              {(['daily', 'stockouts', 'expiry', 'weekly'] as const).map((k) => (
                <div key={k} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <Label htmlFor={`n-${k}`} className="font-normal">
                    {t(`settings.notif.${k}`)}
                  </Label>
                  <Switch id={`n-${k}`} disabled />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>{t('integration.statusTitle')}</CardTitle>
              <CardDescription>{t('integration.statusDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {INTEGRATIONS.map((i) => (
                  <li key={i.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div>
                      <p className="text-sm font-medium">{t(`integrations.${i.id}.name`)}</p>
                      <p className="text-xs text-muted-foreground">{t(`integrations.${i.id}.desc`)}</p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={i.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
