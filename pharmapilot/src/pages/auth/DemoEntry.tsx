import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function DemoEntry() {
  const { t } = useTranslation();
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button asChild variant="outline" className="w-full">
        <Link to="/demo/overview">
          <FlaskConical className="text-amber-600" />
          {t("demo.enter")}
        </Link>
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t("demo.enterHint")}</p>
    </>
  );
}
