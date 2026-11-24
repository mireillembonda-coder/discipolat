import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/common/Logo";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pitch = ["auth.pitch1", "auth.pitch2", "auth.pitch3", "auth.pitch4"] as const;
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="hidden flex-col justify-between bg-night p-10 text-night-foreground lg:flex xl:p-14">
        <Logo inverted />
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">{t("app.tagline")}</p>
          <p className="mt-4 text-night-foreground/65">{t("app.short")}</p>
          <ul className="mt-10 space-y-3">
            {pitch.map((k) => (
              <li key={k} className="flex items-center gap-3 text-sm text-night-foreground/85">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                  <Check className="h-3 w-3 text-emerald-300" />
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-night-foreground/40">© {new Date().getFullYear()} PharmaPilot AI</p>
      </section>
      <section className="flex flex-col px-4 py-8 sm:px-8">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </section>
    </div>
  );
}
