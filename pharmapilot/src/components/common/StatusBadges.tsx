import { AlertOctagon, AlertTriangle, CheckCircle2, Info, PackageX, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { AlertSeverity, StockState } from "@/data/types";

/** Les statuts portent toujours une icône + un libellé, jamais la couleur seule. */
export function StockStateBadge({ state }: { state: StockState }) {
  const { t } = useTranslation();
  const map = {
    rupture: { variant: "destructive", Icon: PackageX },
    critical: { variant: "serious", Icon: AlertTriangle },
    ok: { variant: "success", Icon: CheckCircle2 },
    overstock: { variant: "info", Icon: TrendingUp },
  } as const;
  const { variant, Icon } = map[state];
  return (
    <Badge variant={variant}>
      <Icon /> {t(`stock.states.${state}`)}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { t } = useTranslation();
  const map = {
    critical: { variant: "destructive", Icon: AlertOctagon },
    serious: { variant: "serious", Icon: AlertTriangle },
    warning: { variant: "warning", Icon: AlertTriangle },
    info: { variant: "info", Icon: Info },
  } as const;
  const { variant, Icon } = map[severity];
  return (
    <Badge variant={variant}>
      <Icon /> {t(`alerts.severity.${severity}`)}
    </Badge>
  );
}
