import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "./AuthLayout";
import { BackendNotice } from "./BackendNotice";
import { DemoEntry } from "./DemoEntry";

export function LoginPage() {
  const { t } = useTranslation();
  const { configured, session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/app/overview" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate("/app/overview");
    } catch (err) {
      const e = err as { name?: string; status?: number };
      const network = e.name === "AuthRetryableFetchError" || e.status === 0 || !navigator.onLine;
      setError(t(network ? "auth.network" : "auth.invalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.loginTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
      <div className="mt-8">
        {!configured && <BackendNotice />}
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset disabled={!configured || busy} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-not-allowed text-xs text-muted-foreground" tabIndex={0}>
                      {t("auth.forgot")}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t("common.toConnect")}</TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full">
              {busy && <Loader2 className="animate-spin" />}
              {t("auth.submitLogin")}
            </Button>
          </fieldset>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            {t("auth.toSignup")}
          </Link>
        </p>
        <DemoEntry />
      </div>
    </AuthLayout>
  );
}
