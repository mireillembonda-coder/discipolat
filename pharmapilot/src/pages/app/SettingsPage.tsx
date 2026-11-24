import { CheckCircle2, CircleDashed, CircleDot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/common/PageHeader";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { FEATURES } from "@/config/features";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SUPPORTED_LANGUAGES } from "@/i18n";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { pharmacy, mode } = useWorkspace();
  const { configured, session } = useAuth();

  const platform = [
    { label: "Interface (React, Tailwind, Shadcn UI)", status: "ready" },
    { label: "Mode démonstration isolé", status: "ready" },
    { label: "Internationalisation (FR, EN partiel)", status: "ready" },
    { label: "Authentification Supabase", status: configured ? "ready" : "to-connect" },
    { label: "Liste des officines (Supabase)", status: configured ? "ready" : "to-connect" },
  ] as const;

  const statusBadge = (s: "ready" | "partial" | "to-connect") =>
    s === "ready" ? (
      <Badge variant="success">
        <CheckCircle2 /> Opérationnel
      </Badge>
    ) : s === "partial" ? (
      <Badge variant="warning">
        <CircleDot /> Partiel
      </Badge>
    ) : (
      <Badge variant="pending">
        <CircleDashed /> {t("common.toConnect")}
      </Badge>
    );

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.pharmacy")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="ph-name" label={t("settings.pharmacyName")}>
                <Input id="ph-name" defaultValue={pharmacy?.name} disabled={mode === "demo"} />
              </Field>
            </div>
            <Field id="ph-city" label={t("settings.city")}>
              <Input id="ph-city" defaultValue={pharmacy?.city} disabled={mode === "demo"} />
            </Field>
            <Field id="ph-currency" label={t("settings.currency")}>
              <NativeSelect id="ph-currency" defaultValue={pharmacy?.currency ?? "XAF"} disabled={mode === "demo"}>
                <option value="XAF">XAF — Franc CFA (CEMAC)</option>
                <option value="XOF">XOF — Franc CFA (UEMOA)</option>
                <option value="EUR">EUR — Euro</option>
              </NativeSelect>
            </Field>
            <div className="sm:col-span-2">
              <Field id="ph-tz" label={t("settings.timezone")}>
                <NativeSelect id="ph-tz" defaultValue="Africa/Douala" disabled={mode === "demo"}>
                  <option value="Africa/Douala">Africa/Douala (UTC+1)</option>
                  <option value="Africa/Libreville">Africa/Libreville (UTC+1)</option>
                  <option value="Africa/Brazzaville">Africa/Brazzaville (UTC+1)</option>
                  <option value="Africa/Ndjamena">Africa/Ndjamena (UTC+1)</option>
                  <option value="Africa/Bangui">Africa/Bangui (UTC+1)</option>
                  <option value="Africa/Malabo">Africa/Malabo (UTC+1)</option>
                </NativeSelect>
              </Field>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <ToConnectBadge hint={t("settings.saveHint")} />
            <Button disabled>{t("common.save")}</Button>
          </CardFooter>
        </Card>

        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.preferences")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Field id="lang" label={t("settings.language")}>
                <NativeSelect id="lang" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <p className="mt-2 text-xs text-muted-foreground">{t("settings.languageHint")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.thresholds")}</CardTitle>
            </CardHeader>
            <CardContent className="grid items-end gap-4 sm:grid-cols-3">
              <Field id="cov" label={t("settings.coverageTarget")}>
                <Input id="cov" type="number" defaultValue={15} disabled={mode === "demo"} />
              </Field>
              <Field id="crit" label={t("settings.criticalCoverage")}>
                <Input id="crit" type="number" defaultValue={7} disabled={mode === "demo"} />
              </Field>
              <Field id="exp" label={t("settings.expiryWindow")}>
                <Input id="exp" type="number" defaultValue={90} disabled={mode === "demo"} />
              </Field>
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <ToConnectBadge hint={t("settings.saveHint")} />
              <Button disabled>{t("common.save")}</Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("settings.integrations")}</CardTitle>
            <CardDescription>{t("settings.integrationsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {platform.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-sm">{p.label}</span>
                  {statusBadge(p.status)}
                </li>
              ))}
              {FEATURES.map((f) => (
                <li key={f.key} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{t(`nav.${f.key}`)}</p>
                    <p className="text-xs text-muted-foreground">{f.todo.join(" · ")}</p>
                  </div>
                  <div className="shrink-0">{statusBadge(f.live)}</div>
                </li>
              ))}
            </ul>
            {configured && !session && mode === "demo" && <p className="mt-3 text-xs text-muted-foreground">Supabase est configuré : connectez-vous pour accéder aux données réelles.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
