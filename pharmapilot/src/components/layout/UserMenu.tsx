import { useNavigate } from "react-router-dom";
import { Globe, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SUPPORTED_LANGUAGES } from "@/i18n";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

export function UserMenu() {
  const { t, i18n } = useTranslation();
  const { mode } = useWorkspace();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const name = mode === "demo" ? "Visiteur démo" : ((user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "");
  const email = mode === "demo" ? t("demo.badge") : user?.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("common.profile")}>
          <Avatar>
            <AvatarFallback>{initials(name) || "PP"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => i18n.changeLanguage(l.code)}>
            <Globe className={i18n.language === l.code ? "text-primary" : "text-muted-foreground"} />
            <span className={i18n.language === l.code ? "font-medium" : ""}>{l.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            if (mode === "live") await signOut();
            navigate("/login");
          }}
        >
          <LogOut />
          {mode === "demo" ? t("demo.exit") : t("common.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
