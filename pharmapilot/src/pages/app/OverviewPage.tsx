import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiTile } from "@/components/common/KpiTile";
import { PageHeader } from "@/components/common/PageHeader";
import { PeriodTabs } from "@/components/common/PeriodTabs";
import { QueryView } from "@/components/common/QueryView";
import { SeverityBadge } from "@/components/common/StatusBadges";
import { HBarChart } from "@/components/charts/HBarChart";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { NotConnectedError, type PeriodDays, type StockItem } from "@/data/types";
import { useSourceQuery } from "@/hooks/useSourceQuery";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

function stockHealth(items: StockItem[]) {
  const count = (s: StockItem["state"]) => items.filter((i) => i.state === s).length;
  return { total: items.length, rupture: count("rupture"), critical: count("critical"), ok: count("ok"), overstock: count("overstock") };
}

export function OverviewPage() {
  const { t } = useTranslation();
  const { basePath, pharmacy } = useWorkspace();
  const [period, setPeriod] = useState<PeriodDays>(30);
  const currency = pharmacy?.currency ?? "XAF";

  const { state, reload } = useSourceQuery(
    async (source, ph) => {
      try {
        const [sales, stock, alerts] = await Promise.all([source.getSales(ph.id, period), source.getStock(ph.id), source.getAlerts(ph.id)]);
        return { sales, stock, alerts };
      } catch (e) {
        if (e instanceof NotConnectedError) throw new NotConnectedError("overview");
        throw e;
      }
    },
    [period],
  );

  return (
    <>
      <PageHeader title={t("overview.title")} subtitle={t("overview.subtitle")} actions={<PeriodTabs value={period} onChange={setPeriod} />} />
      <QueryView state={state} reload={reload}>
        {({ sales, stock, alerts }) => {
          const k = sales.kpis;
          const health = stockHealth(stock);
          const stockValue = stock.reduce((s, i) => s + i.value, 0);
          const pct = (v: number) => ({ text: formatPercent(v), sign: Math.sign(Math.round(v * 1000)) });
          return (
            <div className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <KpiTile label={t("kpi.revenue")} value={formatCurrency(k.revenue.value, currency)} delta={pct(k.revenue.delta)} deltaLabel={t("common.vsPrevious")} />
                <KpiTile label={t("kpi.transactions")} value={formatNumber(k.transactions.value)} delta={pct(k.transactions.delta)} deltaLabel={t("common.vsPrevious")} />
                <KpiTile label={t("kpi.basket")} value={formatCurrency(k.basket.value, currency)} delta={pct(k.basket.delta)} deltaLabel={t("common.vsPrevious")} />
                <KpiTile
                  label={t("kpi.margin")}
                  value={formatPercent(k.marginRate.value).replace("+", "")}
                  delta={{ text: `${formatNumber(k.marginRate.delta * 100, { maximumFractionDigits: 1, signDisplay: "exceptZero" })} pt`, sign: Math.sign(Math.round(k.marginRate.delta * 1000)) }}
                  deltaLabel={t("common.vsPrevious")}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>{t("overview.revenueChart")}</CardTitle>
                    <CardDescription>{t("overview.revenueChartHint")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RevenueChart data={sales.daily} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>{t("overview.priorityAlerts")}</CardTitle>
                    <Button asChild variant="ghost" size="sm" className="-mr-2">
                      <Link to={`${basePath}/alerts`}>
                        {t("common.seeAll")} <ArrowRight />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y">
                      {alerts.slice(0, 5).map((a) => (
                        <li key={a.id} className="flex flex-col gap-1 py-2.5 first:pt-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{a.title}</p>
                            <SeverityBadge severity={a.severity} />
                          </div>
                          <p className="text-xs text-muted-foreground">{a.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>{t("overview.byCategory")}</CardTitle>
                    <CardDescription>{t("kpi.revenue")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HBarChart
                      data={sales.categories}
                      labelKey="category"
                      valueKey="revenue"
                      valueName={t("kpi.revenue")}
                      format={(v) => formatCurrency(v, currency)}
                      formatTick={(v) => formatCurrency(v, currency, { compact: true })}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>{t("overview.stockHealth")}</CardTitle>
                    <Button asChild variant="ghost" size="sm" className="-mr-2">
                      <Link to={`${basePath}/stock`}>
                        {t("common.seeAll")} <ArrowRight />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("kpi.stockValue")}</p>
                      <p className="tabular text-xl font-semibold">{formatCurrency(stockValue, currency)}</p>
                    </div>
                    {(
                      [
                        ["rupture", health.rupture, "bg-red-600"],
                        ["critical", health.critical, "bg-orange-500"],
                        ["ok", health.ok, "bg-emerald-600"],
                        ["overstock", health.overstock, "bg-blue-600"],
                      ] as const
                    ).map(([key, n, color]) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span>{t(`stock.states.${key}`)}</span>
                          <span className="tabular text-muted-foreground">
                            {n} / {health.total}
                          </span>
                        </div>
                        <Progress value={(n / health.total) * 100} indicatorClassName={color} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("overview.topProducts")}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("sales.product")}</TableHead>
                        <TableHead className="hidden md:table-cell">{t("sales.category")}</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">{t("sales.qty")}</TableHead>
                        <TableHead className="text-right">{t("sales.revenue")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.products.slice(0, 6).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">{p.category}</TableCell>
                          <TableCell className="tabular hidden text-right sm:table-cell">{formatNumber(p.qty)}</TableCell>
                          <TableCell className="tabular text-right">{formatCurrency(p.revenue, currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
