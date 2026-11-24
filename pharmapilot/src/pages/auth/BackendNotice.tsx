import { ServerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BackendNotice() {
  const { t } = useTranslation();
  return (
    <Alert variant="warning" className="mb-6">
      <ServerOff />
      <AlertTitle>{t("auth.notConfiguredTitle")}</AlertTitle>
      <AlertDescription>{t("auth.notConfigured")}</AlertDescription>
    </Alert>
  );
}
