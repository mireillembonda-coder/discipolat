import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiTile } from "@/components/common/KpiTile";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryView } from "@/components/common/QueryView";
import { StockStateBadge } from "@/components/common/StatusBadges";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { StockItem, StockState } from "@/data/types";
import { useSourceQuery } from "@/hooks/useSourceQuery";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

type Filter = "all" | StockState;

function StockTable({ items, currency }: { items: StockItem[]; currency: string }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo(
    () =>
      items
        .filter((i) => (filter === "all" ? true : i.state === filter))
        .filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.coverageDays - b.coverageDays),
    [items, q, filter],
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("stock.searchPlaceholder")} className="pl-9" />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="max-w-full overflow-x-auto">
            <TabsList>
              <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
              <TabsTrigger value="rupture">{t("stock.states.rupture")}</TabsTrigger>
              <TabsTrigger value="critical">{t("stock.states.critical")}</TabsTrigger>
              <TabsTrigger value="ok">{t("stock.states.ok")}</TabsTrigger>
              <TabsTrigger value="overstock">{t("stock.states.overstock")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="-mx-2 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stock.product")}</TableHead>
                <TableHead className="text-right">{t("stock.onHand")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("stock.dailySales")}</TableHead>
                <TableHead className="text-right">{t("stock.coverage")}</TableHead>
                <TableHead className="hidden text-right lg:table-cell">{t("stock.value")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("stock.expiry")}</TableHead>
                <TableHead>{t("stock.state")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category}</p>
                  </TableCell>
                  <TableCell className="tabular text-right">{formatNumber(i.onHand)}</TableCell>
                  <TableCell className="tabular hidden text-right md:table-cell">{formatNumber(i.dailySales, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell className="tabular whitespace-nowrap text-right">
                    {i.coverageDays >= 999 ? "—" : `${formatNumber(i.coverageDays, { maximumFractionDigits: 0 })} ${t("common.days")}`}
                  </TableCell>
                  <TableCell className="tabular hidden text-right lg:table-cell">{formatCurrency(i.value, currency)}</TableCell>
                  <TableCell className="tabular hidden text-muted-foreground lg:table-cell">
                    {i.expiry ? formatDate(i.expiry, { month: "short", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell>
                    <StockStateBadge state={i.state} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t("common.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function StockPage() {
  const { t } = useTranslation();
  const { pharmacy } = useWorkspace();
  const currency = pharmacy?.currency ?? "XAF";
  const { state, reload } = useSourceQuery((s, ph) => s.getStock(ph.id));

  return (
    <>
      <PageHeader title={t("stock.title")} subtitle={t("stock.subtitle")} />
      <QueryView state={state} reload={reload}>
        {(items) => {
          const value = items.reduce((s, i) => s + i.value, 0);
          const withSales = items.filter((i) => i.dailySales > 0 && i.coverageDays < 999);
          const avgCoverage = withSales.reduce((s, i) => s + i.coverageDays, 0) / Math.max(1, withSales.length);
          return (
            <div className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <KpiTile label={t("kpi.stockValue")} value={formatCurrency(value, currency)} />
                <KpiTile label={t("kpi.coverage")} value={`${formatNumber(avgCoverage, { maximumFractionDigits: 0 })} ${t("common.days")}`} />
                <KpiTile label={t("kpi.ruptures")} value={formatNumber(items.filter((i) => i.state === "rupture").length)} />
                <KpiTile label={t("kpi.overstock")} value={formatNumber(items.filter((i) => i.state === "overstock").length)} />
              </div>
              <StockTable items={items} currency={currency} />
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
