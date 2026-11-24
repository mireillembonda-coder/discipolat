import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import type { DataMode } from "@/data/types";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { AlertsPage } from "@/pages/app/AlertsPage";
import { AssistantPage } from "@/pages/app/AssistantPage";
import { ImportPage } from "@/pages/app/ImportPage";
import { NotFoundPage } from "@/pages/app/NotFoundPage";
import { OrdersPage } from "@/pages/app/OrdersPage";
import { OverviewPage } from "@/pages/app/OverviewPage";
import { ReportsPage } from "@/pages/app/ReportsPage";
import { SalesPage } from "@/pages/app/SalesPage";
import { SettingsPage } from "@/pages/app/SettingsPage";
import { StockPage } from "@/pages/app/StockPage";
import { SubscriptionPage } from "@/pages/app/SubscriptionPage";
import { UsersPage } from "@/pages/app/UsersPage";

/** Espace réel : authentification obligatoire. */
function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function Workspace({ mode }: { mode: DataMode }) {
  // `key` force un remontage complet lors du passage démo ↔ réel : aucun état partagé.
  return (
    <WorkspaceProvider key={mode} mode={mode}>
      <AppShell />
    </WorkspaceProvider>
  );
}

function workspaceRoutes(mode: DataMode) {
  const base = mode === "demo" ? "/demo" : "/app";
  return (
    <>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview" element={<OverviewPage />} />
      <Route path="sales" element={<SalesPage />} />
      <Route path="stock" element={<StockPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="assistant" element={<AssistantPage />} />
      <Route path="import" element={<ImportPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="subscription" element={<SubscriptionPage />} />
      <Route path="*" element={<NotFoundPage home={`${base}/overview`} />} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route path="/demo" element={<Workspace mode="demo" />}>
              {workspaceRoutes("demo")}
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="/app" element={<Workspace mode="live" />}>
                {workspaceRoutes("live")}
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
}
