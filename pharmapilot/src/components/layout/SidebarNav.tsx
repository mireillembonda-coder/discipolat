import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FEATURES, type FeatureDef } from "@/config/features";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";

const SECTIONS: FeatureDef["section"][] = ["pilot", "tools", "account"];
const SECTION_LABEL = { pilot: "nav.sectionPilot", tools: "nav.sectionTools", account: "nav.sectionAccount" } as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { basePath, mode } = useWorkspace();
  return (
    <div className="flex h-full flex-col bg-night text-night-foreground">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo inverted />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={t("common.menu")}>
        {SECTIONS.map((section) => (
          <div key={section} className="mt-4 first:mt-1">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-night-foreground/45">{t(SECTION_LABEL[section])}</p>
            <ul className="space-y-0.5">
              {FEATURES.filter((f) => f.section === section).map((f) => (
                <li key={f.key}>
                  <NavLink
                    to={`${basePath}/${f.path}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-night-muted font-medium text-white"
                          : "text-night-foreground/70 hover:bg-night-muted/60 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <f.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-300" : "text-night-foreground/50 group-hover:text-night-foreground/80")} />
                        <span className="truncate">{t(`nav.${f.key}`)}</span>
                        {mode === "live" && f.live === "to-connect" && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-night-foreground/25" title={t("common.toConnect")} />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] leading-relaxed text-night-foreground/45">{t("app.tagline")}</div>
    </div>
  );
}
