import { Link } from "react-router-dom";
import { Check, Plug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { featureByKey } from "@/config/features";
import type { FeatureKey } from "@/data/types";

/** État affiché en mode réel lorsqu'une vue n'a pas encore de source de données. */
export function NotConnectedState({ feature }: { feature: FeatureKey }) {
  const { t } = useTranslation();
  const def = featureByKey(feature);
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-start gap-5 p-6 sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Plug className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold">{t("status.toConnectTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("status.toConnectBody")}</p>
        </div>
        <div className="w-full max-w-2xl rounded-lg bg-secondary/60 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("status.remaining")}</p>
          <ul className="space-y-1.5 text-sm">
            {def.todo.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/demo/${def.path}`}>{t("status.tryDemo")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
