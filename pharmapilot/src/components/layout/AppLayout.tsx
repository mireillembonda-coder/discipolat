import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { EmptyState } from '@/components/common/states'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { Sidebar, SidebarContent } from './Sidebar'
import { PharmacySwitcher } from './PharmacySwitcher'
import { UserMenu } from './UserMenu'
import { Building2 } from 'lucide-react'

function DemoBanner() {
  const { t } = useTranslation()
  const { exitDemo } = useWorkspace()
  const navigate = useNavigate()
  return (
    <div role="status" className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 lg:px-8">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-snug">{t('mode.demoBanner')}</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 text-amber-900 hover:bg-amber-100"
        onClick={() => {
          exitDemo()
          navigate('/connexion', { replace: true })
        }}
      >
        {t('mode.exitDemo')}
      </Button>
    </div>
  )
}

export function AppLayout() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { mode, pharmaciesStatus, pharmacies } = useWorkspace()

  const noPharmacy = mode === 'live' && pharmaciesStatus === 'ready' && pharmacies.length === 0
  const loadError = pharmaciesStatus === 'error'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="border-none p-0">
          <SheetTitle className="sr-only">PharmaPilot AI</SheetTitle>
          <SheetDescription className="sr-only">Navigation</SheetDescription>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        {mode === 'demo' && <DemoBanner />}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-8">
          <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
          <PharmacySwitcher />
          <div className="ml-auto flex items-center gap-2">
            {mode === 'demo' ? (
              <Badge variant="demo" className="hidden sm:inline-flex">
                <FlaskConical /> {t('mode.demo')}
              </Badge>
            ) : (
              <Badge variant="success" className="hidden sm:inline-flex">
                {t('mode.live')}
              </Badge>
            )}
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
          {noPharmacy || loadError ? (
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={<Building2 className="h-5 w-5" />}
                title={loadError ? t('common.errorTitle') : t('pharmacy.noneTitle')}
                body={loadError ? t('pharmacy.loadError') : t('pharmacy.noneBody')}
              >
                <IntegrationBadge id="onboarding" />
              </EmptyState>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
