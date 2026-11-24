import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "./AuthLayout";
import { BackendNotice } from "./BackendNotice";
import { DemoEntry } from "./DemoEntry";

export function SignupPage() {
  const { t } = useTranslation();
  const { configured, session, signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", pharmacyName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  if (session) return <Navigate to="/app/overview" replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(form);
      if (needsConfirmation) setConfirmSent(true);
      else navigate("/app/overview");
    } catch (err) {
      const e = err as { name?: string; status?: number; message: string };
      setError(e.name === "AuthRetryableFetchError" || e.status === 0 ? t("auth.network") : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.signupTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>
      <div className="mt-8">
        {!configured && <BackendNotice />}
        {confirmSent ? (
          <Alert variant="success">
            <MailCheck />
            <AlertDescription>{t("auth.checkEmail")}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit}>
            <fieldset disabled={!configured || busy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input id="fullName" autoComplete="name" required value={form.fullName} onChange={set("fullName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pharmacyName">{t("auth.pharmacyName")}</Label>
                <Input id="pharmacyName" autoComplete="organization" required value={form.pharmacyName} onChange={set("pharmacyName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={set("password")}
                />
                <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                {busy && <Loader2 className="animate-spin" />}
                {t("auth.submitSignup")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("auth.terms")}</p>
            </fieldset>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.toLogin")}
          </Link>
        </p>
        <DemoEntry />
      </div>
    </AuthLayout>
  );
}
