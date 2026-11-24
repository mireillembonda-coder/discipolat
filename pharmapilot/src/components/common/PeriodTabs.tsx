import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PeriodDays } from "@/data/types";

export function PeriodTabs({ value, onChange }: { value: PeriodDays; onChange: (p: PeriodDays) => void }) {
  const { t } = useTranslation();
  return (
    <Tabs value={String(value)} onValueChange={(v) => onChange(Number(v) as PeriodDays)}>
      <TabsList aria-label={t("common.period")}>
        <TabsTrigger value="7">{t("common.days7")}</TabsTrigger>
        <TabsTrigger value="30">{t("common.days30")}</TabsTrigger>
        <TabsTrigger value="90">{t("common.days90")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
