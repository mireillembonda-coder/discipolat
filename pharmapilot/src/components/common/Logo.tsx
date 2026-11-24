import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="8" fill="#047857" />
      <path d="M10 23V9h6.5a5 5 0 0 1 0 10H13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.5" cy="22.5" r="2.1" fill="#a7f3d0" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-night-foreground" : "text-foreground")}>
        PharmaPilot <span className={inverted ? "text-emerald-300" : "text-primary"}>AI</span>
      </span>
    </div>
  );
}
