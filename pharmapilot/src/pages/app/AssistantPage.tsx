import { Bot, Info, Send, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSourceQuery } from "@/hooks/useSourceQuery";

/**
 * Assistant IA — interface uniquement.
 * Aucun modèle n'est appelé : le champ de saisie est désactivé tant que la fonction serveur
 * (Supabase Edge Function) n'est pas branchée. En démonstration, un échange STATIQUE illustre
 * l'usage, construit à partir des données fictives affichées ailleurs.
 */
export function AssistantPage() {
  const { t } = useTranslation();
  const { mode } = useWorkspace();
  const { state } = useSourceQuery((s, ph) => (mode === "demo" ? s.getStock(ph.id) : Promise.resolve([])), [mode]);
  const urgent = state.status === "ok" ? state.data.filter((i) => i.coverageDays < 7).sort((a, b) => a.coverageDays - b.coverageDays) : [];

  return (
    <>
      <PageHeader title={t("assistant.title")} subtitle={t("assistant.subtitle")} actions={<ToConnectBadge />} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
        <Card className="flex min-h-[28rem] flex-col">
          <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
            <Alert variant="info">
              <Info />
              <AlertDescription>{t("assistant.notConnected")}</AlertDescription>
            </Alert>

            <div className="flex-1 space-y-4">
              {mode === "demo" && urgent.length > 0 && (
                <>
                  <Badge variant="demo">{t("assistant.exampleLabel")}</Badge>
                  <div className="flex justify-end gap-3">
                    <p className="max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{t("assistant.exampleQuestion")}</p>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Bot className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <p className="max-w-[85%] rounded-lg rounded-tl-sm bg-secondary px-4 py-2.5 text-sm leading-relaxed">
                      {t("assistant.exampleAnswer", {
                        count: urgent.length,
                        list: urgent
                          .slice(0, 3)
                          .map((i) => i.name.split(" — ")[0])
                          .join(", "),
                      })}
                    </p>
                  </div>
                </>
              )}
            </div>

            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <Input disabled placeholder={t("assistant.placeholder")} aria-label={t("assistant.placeholder")} />
              <Button type="submit" disabled size="icon" aria-label={t("assistant.send")}>
                <Send />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">{t("assistant.disclaimer")}</p>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("assistant.suggestions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["q1", "q2", "q3", "q4"] as const).map((q) => (
              <button
                key={q}
                type="button"
                disabled
                className="w-full rounded-md border px-3 py-2 text-left text-sm text-muted-foreground disabled:cursor-not-allowed"
              >
                {t(`assistant.${q}`)}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
