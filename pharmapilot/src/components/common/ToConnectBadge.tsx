import { Plug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Marqueur visuel des fonctionnalités non encore branchées. */
export function ToConnectBadge({ hint }: { hint?: string }) {
  const { t } = useTranslation();
  const badge = (
    <Badge variant="pending" className="cursor-default">
      <Plug /> {t("common.toConnect")}
    </Badge>
  );
  if (!hint) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{badge}</span>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}
