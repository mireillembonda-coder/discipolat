import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryView } from "@/components/common/QueryView";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OrderSuggestion } from "@/data/types";
import { useSourceQuery } from "@/hooks/useSourceQuery";
import { formatCurrency, formatNumber } from "@/lib/format";

export function OrdersPage() {
  const { t } = useTranslation();
  const { pharmacy } = useWorkspace();
  const currency = pharmacy?.currency ?? "XAF";
  const [target, setTarget] = useState(15);
  const { state, reload } = useSourceQuery((s, ph) => s.getOrderSuggestions(ph.id, target), [target]);

  return (
    <>
      <PageHeader
        title={t("orders.title")}
        subtitle={t("orders.subtitle")}
        actions={
          <>
            <NativeSelect value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label={t("settings.coverageTarget")} className="w-56">
              {[7, 15, 30, 45].map((d) => (
                <option key={d} value={d}>
                  {t("orders.suggestionsHint", { days: d })}
                </option>
              ))}
            </NativeSelect>
            <ToConnectBadge hint={t("orders.sendHint")} />
            <Button disabled>
              <Send /> {t("orders.send")}
            </Button>
          </>
        }
      />
      <QueryView state={state} reload={reload}>
        {(lines) => {
          const bySupplier = lines.reduce<Record<string, OrderSuggestion[]>>((acc, l) => {
            (acc[l.supplier] ??= []).push(l);
            return acc;
          }, {});
          const total = lines.reduce((s, l) => s + l.suggestedQty * l.unitCost, 0);
          return (
            <div className="space-y-4 lg:space-y-6">
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("orders.total")}</p>
                    <p className="tabular text-2xl font-semibold">{formatCurrency(total, currency)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lines.length} {t("orders.lines")} · {Object.keys(bySupplier).length} {t("orders.suppliers")}
                  </p>
                </CardContent>
              </Card>
              {Object.entries(bySupplier).map(([supplier, ls]) => (
                <Card key={supplier}>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>{supplier}</CardTitle>
                      <CardDescription>
                        {ls.length} {t("orders.lines")}
                      </CardDescription>
                    </div>
                    <p className="tabular text-sm font-medium">{formatCurrency(ls.reduce((s, l) => s + l.suggestedQty * l.unitCost, 0), currency)}</p>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-5">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("orders.product")}</TableHead>
                          <TableHead className="text-right">{t("orders.onHand")}</TableHead>
                          <TableHead className="text-right">{t("orders.suggested")}</TableHead>
                          <TableHead className="hidden md:table-cell">{t("orders.reason")}</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">{t("orders.amount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ls.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell className="tabular text-right">{formatNumber(l.onHand)}</TableCell>
                            <TableCell className="tabular text-right font-semibold text-primary">{formatNumber(l.suggestedQty)}</TableCell>
                            <TableCell className="hidden text-muted-foreground md:table-cell">
                              {t(`orders.reasons.${l.reason}`, { days: formatNumber(l.coverageDays, { maximumFractionDigits: 0 }) })}
                            </TableCell>
                            <TableCell className="tabular hidden text-right sm:table-cell">{formatCurrency(l.suggestedQty * l.unitCost, currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
              {lines.length === 0 && <p className="text-sm text-muted-foreground">{t("common.noData")}</p>}
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
