import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Sélecteur d'officine — prêt pour les comptes multi-officines. */
export function PharmacySwitcher() {
  const { t } = useTranslation();
  const { pharmacies, pharmacy, selectPharmacy, loading } = useWorkspace();

  if (loading) return <Skeleton className="h-9 w-48" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 max-w-[16rem] justify-between gap-2 px-3" aria-label={t("pharmacy.switchTo")}>
          <Building2 className="text-primary" />
          <span className="truncate">{pharmacy?.name ?? t("pharmacy.none")}</span>
          <ChevronsUpDown className="ml-auto text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("pharmacy.selectorLabel")}</DropdownMenuLabel>
        {pharmacies.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => selectPharmacy(p.id)}>
            <div className="min-w-0 flex-1">
              <p className="truncate">{p.name}</p>
              {p.city && <p className="truncate text-xs text-muted-foreground">{p.city}</p>}
            </div>
            {p.id === pharmacy?.id && <Check className="text-primary" />}
          </DropdownMenuItem>
        ))}
        {pharmacies.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("pharmacy.noneHint")}</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Plus />
          <div>
            <p>{t("pharmacy.add")}</p>
            <p className="text-xs text-muted-foreground">{t("pharmacy.addHint")}</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
