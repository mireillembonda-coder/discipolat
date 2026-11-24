import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const { t } = useTranslation();
  const { mode, pharmacy } = useWorkspace();
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {pharmacy && <span className="truncate">{pharmacy.name}</span>}
          {mode === "demo" && (
            <Badge variant="demo">
              <FlaskConical /> {t("common.demoData")}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
