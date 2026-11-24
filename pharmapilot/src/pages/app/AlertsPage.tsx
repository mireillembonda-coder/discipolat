import { useState } from "react";
import { AlertTriangle, CalendarClock, PackageX, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryView } from "@/components/common/QueryView";
import { SeverityBadge } from "@/components/common/StatusBadges";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import type { AlertSeverity, AlertType } from "@/data/types";
import { useSourceQuery } from "@/hooks/useSourceQuery";
import { formatDate } from "@/lib/format";

const TYPE_ICON: Record<AlertType, typeof AlertTriangle> = {
  rupture: PackageX,
  expiry: CalendarClock,
  anomaly: Activity,
  margin: TrendingDown,
  overstock: TrendingUp,
};

export function AlertsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");
  const { state, reload } = useSourceQuery((s, ph) => s.getAlerts(ph.id));

  return (
    <>
      <PageHeader title={t("alerts.title")} subtitle={t("alerts.subtitle")} actions={<ToConnectBadge hint="Notifications e-mail / push" />} />
      <QueryView state={state} reload={reload}>
        {(alerts) => {
          const rows = alerts.filter((a) => filter === "all" || a.severity === filter);
          const count = (s: AlertSeverity) => alerts.filter((a) => a.severity === s).length;
          return (
            <div className="space-y-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="max-w-full overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="all">
                    {t("common.all")} ({alerts.length})
                  </TabsTrigger>
                  {(["critical", "serious", "warning", "info"] as const).map((s) => (
                    <TabsTrigger key={s} value={s}>
                      {t(`alerts.severity.${s}`)} ({count(s)})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {rows.map((a) => {
                      const Icon = TYPE_ICON[a.type];
                      return (
                        <li key={a.id} className="flex items-start gap-4 p-4 sm:px-5">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{a.title}</p>
                              <span className="text-xs text-muted-foreground">· {t(`alerts.types.${a.type}`)}</span>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">{a.detail}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <SeverityBadge severity={a.severity} />
                            <span className="text-xs text-muted-foreground">{formatDate(a.date)}</span>
                          </div>
                        </li>
                      );
                    })}
                    {rows.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">{t("alerts.empty")}</li>}
                  </ul>
                </CardContent>
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
