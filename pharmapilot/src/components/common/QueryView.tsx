import type { ReactNode } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueryState } from "@/hooks/useSourceQuery";
import { NotConnectedState } from "./NotConnectedState";

export function QueryView<T>({
  state,
  reload,
  children,
  skeleton,
}: {
  state: QueryState<T>;
  reload?: () => void;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
}) {
  const { t } = useTranslation();
  switch (state.status) {
    case "loading":
      return (
        <>
          {skeleton ?? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
              <Skeleton className="h-80" />
            </div>
          )}
        </>
      );
    case "no-pharmacy":
      return (
        <Alert>
          <Building2 />
          <AlertTitle>{t("pharmacy.none")}</AlertTitle>
          <AlertDescription>{t("pharmacy.noneHint")}</AlertDescription>
        </Alert>
      );
    case "not-connected":
      return <NotConnectedState feature={state.feature} />;
    case "error":
      return (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{state.error.message}</span>
            {reload && (
              <Button size="sm" variant="outline" onClick={reload}>
                {t("common.retry")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    case "ok":
      return <>{children(state.data)}</>;
  }
}
