import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function NotFoundPage({ home = "/login" }: { home?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
      <Button asChild className="mt-6">
        <Link to={home}>{t("notFound.back")}</Link>
      </Button>
    </div>
  );
}
