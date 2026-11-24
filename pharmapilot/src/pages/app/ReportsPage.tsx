import { FileBarChart, FileSpreadsheet, FileText, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const TEMPLATES = [
  { key: "monthly", Icon: FileBarChart },
  { key: "stock", Icon: Package },
  { key: "orders", Icon: FileSpreadsheet },
  { key: "category", Icon: FileText },
] as const;

export function ReportsPage() {
  const { t } = useTranslation();
  const { pharmacy } = useWorkspace();
  return (
    <>
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} actions={<ToConnectBadge hint={t("reports.generateHint")} />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
        {TEMPLATES.map(({ key, Icon }) => (
          <Card key={key} className="flex flex-col">
            <CardHeader className="flex-row items-start gap-4 space-y-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle>{t(`reports.templates.${key}.name`)}</CardTitle>
                <CardDescription className="mt-1">{t(`reports.templates.${key}.desc`)}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-xs text-muted-foreground">
                {t("reports.lastGenerated")} : {t("reports.never")}
              </p>
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">{pharmacy?.name}</span>
              <Button variant="outline" size="sm" disabled title={t("reports.generateHint")}>
                {t("reports.generate")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
