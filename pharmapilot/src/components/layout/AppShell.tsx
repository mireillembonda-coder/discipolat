import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { FlaskConical, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LogoMark } from "@/components/common/Logo";
import { PharmacySwitcher } from "./PharmacySwitcher";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950 sm:text-sm" role="status">
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-700" />
      <p className="flex-1">{t("demo.banner")}</p>
      <Link to="/login" className="shrink-0 font-medium underline underline-offset-2 hover:no-underline">
        {t("demo.exit")}
      </Link>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { mode } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarNav />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent closeLabel={t("common.close")} className="border-0 p-0">
          <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>
          <SheetDescription className="sr-only">{t("app.name")}</SheetDescription>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        {mode === "demo" && <DemoBanner />}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:gap-3 sm:px-6">
          <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setOpen(true)} aria-label={t("common.menu")}>
            <Menu className="!size-5" />
          </Button>
          <LogoMark className="h-7 w-7 lg:hidden" />
          <div className="min-w-0 flex-1">
            <PharmacySwitcher />
          </div>
          <Badge variant={mode === "demo" ? "demo" : "success"} className="hidden sm:inline-flex">
            {mode === "demo" ? t("status.demo") : t("status.live")}
          </Badge>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
