import { lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { Skeleton } from '@/components/common/states'
import { Button } from '@/components/ui/button'

const OverviewPage = lazy(() => import('@/pages/OverviewPage'))
const SalesPage = lazy(() => import('@/pages/SalesPage'))
const StockPage = lazy(() => import('@/pages/StockPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const AssistantPage = lazy(() => import('@/pages/AssistantPage'))
const ImportPage = lazy(() => import('@/pages/ImportPage'))
const UsersPage = lazy(() => import('@/pages/UsersPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'))

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-8 w-40" />
    </div>
  )
}

/** Accès à l'application : session Supabase réelle OU mode démonstration explicite. */
function RequireWorkspace({ children }: { children: ReactNode }) {
  const { loading } = useAuth()
  const { mode } = useWorkspace()
  if (loading) return <FullScreenLoader />
  if (!mode) return <Navigate to="/connexion" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { loading } = useAuth()
  const { mode } = useWorkspace()
  if (loading) return <FullScreenLoader />
  if (mode) return <Navigate to="/" replace />
  return <>{children}</>
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-semibold text-navy">{t('notFound.title')}</p>
      <Button asChild variant="link">
        <Link to="/">{t('notFound.back')}</Link>
      </Button>
    </div>
  )
}

const page = (el: ReactNode) => <Suspense fallback={<Skeleton className="h-96 w-full" />}>{el}</Suspense>

export function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <TooltipProvider delayDuration={150}>
            <HashRouter>
              <Routes>
                <Route path="/connexion" element={<PublicOnly><LoginPage /></PublicOnly>} />
                <Route path="/inscription" element={<PublicOnly><SignupPage /></PublicOnly>} />
                <Route element={<RequireWorkspace><AppLayout /></RequireWorkspace>}>
                  <Route index element={page(<OverviewPage />)} />
                  <Route path="ventes" element={page(<SalesPage />)} />
                  <Route path="stocks" element={page(<StockPage />)} />
                  <Route path="commandes" element={page(<OrdersPage />)} />
                  <Route path="alertes" element={page(<AlertsPage />)} />
                  <Route path="rapports" element={page(<ReportsPage />)} />
                  <Route path="assistant" element={page(<AssistantPage />)} />
                  <Route path="importation" element={page(<ImportPage />)} />
                  <Route path="utilisateurs" element={page(<UsersPage />)} />
                  <Route path="parametres" element={page(<SettingsPage />)} />
                  <Route path="abonnement" element={page(<SubscriptionPage />)} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </PreferencesProvider>
  )
}
