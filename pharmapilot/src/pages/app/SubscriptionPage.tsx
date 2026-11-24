import { Check, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Grille INDICATIVE — à valider commercialement avant tout branchement du paiement. */
const PLANS = [
  { key: "essential", price: 25000, features: ["dashboards", "alerts", "imports"] },
  { key: "pro", price: 45000, features: ["dashboards", "alerts", "imports", "orders", "assistant", "reports"], highlight: true },
  { key: "multi", price: null, features: ["dashboards", "alerts", "imports", "orders", "assistant", "reports", "multi", "users"] },
] as const;

export function SubscriptionPage() {
  const { t } = useTranslation();
  const { mode } = useWorkspace();
  const current = mode === "demo" ? "pro" : null;

  return (
    <>
      <PageHeader title={t("subscription.title")} subtitle={t("subscription.subtitle")} actions={<ToConnectBadge />} />
      <Alert variant="info" className="mb-6">
        <Info />
        <AlertDescription>{t("subscription.pricesNote")}</AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {PLANS.map((p) => (
          <Card key={p.key} className={cn("flex flex-col", "highlight" in p && p.highlight && "border-primary ring-1 ring-primary")}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t(`subscription.plans.${p.key}.name`)}</CardTitle>
                {current === p.key && <Badge variant="demo">{t("subscription.currentPlan")}</Badge>}
              </div>
              <CardDescription>{t(`subscription.plans.${p.key}.desc`)}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-5">
              <p>
                {p.price ? (
                  <>
                    <span className="tabular text-2xl font-semibold">{formatCurrency(p.price)}</span>
                    <span className="text-sm text-muted-foreground"> {t("subscription.perMonth")}</span>
                  </>
                ) : (
                  <span className="text-2xl font-semibold">Sur devis</span>
                )}
              </p>
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {t(`subscription.features.${f}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={"highlight" in p && p.highlight ? "default" : "outline"} disabled>
                {t("subscription.choose")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
