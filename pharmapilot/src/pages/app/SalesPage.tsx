import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiTile } from "@/components/common/KpiTile";
import { PageHeader } from "@/components/common/PageHeader";
import { PeriodTabs } from "@/components/common/PeriodTabs";
import { QueryView } from "@/components/common/QueryView";
import { HBarChart } from "@/components/charts/HBarChart";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { VBarChart } from "@/components/charts/VBarChart";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { PeriodDays } from "@/data/types";
import { useSourceQuery } from "@/hooks/useSourceQuery";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export function SalesPage() {
  const { t } = useTranslation();
  const { pharmacy } = useWorkspace();
  const currency = pharmacy?.currency ?? "XAF";
  const [period, setPeriod] = useState<PeriodDays>(30);
  const { state, reload } = useSourceQuery((s, ph) => s.getSales(ph.id, period), [period]);

  return (
    <>
      <PageHeader title={t("sales.title")} subtitle={t("sales.subtitle")} actions={<PeriodTabs value={period} onChange={setPeriod} />} />
      <QueryView state={state} reload={reload}>
        {(sales) => {
          const pct = (v: number) => ({ text: formatPercent(v), sign: Math.sign(Math.round(v * 1000)) });
          const marginTotal = sales.categories.reduce((s, c) => s + c.margin, 0);
          return (
            <div className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <KpiTile label={t("kpi.revenue")} value={formatCurrency(sales.kpis.revenue.value, currency)} delta={pct(sales.kpis.revenue.delta)} deltaLabel={t("common.vsPrevious")} />
                <KpiTile label={t("sales.margin")} value={formatCurrency(marginTotal, currency)} />
                <KpiTile label={t("kpi.transactions")} value={formatNumber(sales.kpis.transactions.value)} delta={pct(sales.kpis.transactions.delta)} deltaLabel={t("common.vsPrevious")} />
                <KpiTile label={t("kpi.basket")} value={formatCurrency(sales.kpis.basket.value, currency)} delta={pct(sales.kpis.basket.delta)} deltaLabel={t("common.vsPrevious")} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("sales.trend")}</CardTitle>
                  <CardDescription>{t("overview.revenueChartHint")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={sales.daily} height={300} />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("sales.marginByCategory")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HBarChart
                      data={[...sales.categories].sort((a, b) => b.margin - a.margin)}
                      labelKey="category"
                      valueKey="margin"
                      valueName={t("sales.margin")}
                      format={(v) => formatCurrency(v, currency)}
                      formatTick={(v) => formatCurrency(v, currency, { compact: true })}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("sales.hourly")}</CardTitle>
                    <CardDescription>{t("sales.hourlyHint")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VBarChart data={sales.hourly} labelKey="hour" valueKey="transactions" valueName={t("kpi.transactions")} format={(v) => formatNumber(v, { maximumFractionDigits: 1 })} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("sales.products")}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("sales.product")}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t("sales.category")}</TableHead>
                        <TableHead className="text-right">{t("sales.qty")}</TableHead>
                        <TableHead className="text-right">{t("sales.revenue")}</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">{t("sales.margin")}</TableHead>
                        <TableHead className="hidden text-right md:table-cell">{t("sales.marginRate")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">{p.category}</TableCell>
                          <TableCell className="tabular text-right">{formatNumber(p.qty)}</TableCell>
                          <TableCell className="tabular text-right">{formatCurrency(p.revenue, currency)}</TableCell>
                          <TableCell className="tabular hidden text-right sm:table-cell">{formatCurrency(p.margin, currency)}</TableCell>
                          <TableCell className="tabular hidden text-right md:table-cell">
                            {p.revenue ? formatPercent(p.margin / p.revenue).replace("+", "") : "—"}
                          </TableCell>
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
