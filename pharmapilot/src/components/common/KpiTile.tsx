import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  delta,
  deltaLabel,
  hint,
  invert = false,
}: {
  label: string;
  value: string;
  /** Texte de variation déjà formaté, et son signe. */
  delta?: { text: string; sign: number };
  deltaLabel?: string;
  hint?: string;
  /** Une hausse est défavorable (ex. ruptures). */
  invert?: boolean;
}) {
  const good = delta ? (invert ? delta.sign < 0 : delta.sign > 0) : false;
  const Icon = !delta || delta.sign === 0 ? Minus : delta.sign > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <p className="tabular mt-2 break-words text-lg font-semibold leading-tight tracking-tight sm:text-2xl">{value}</p>
        {delta && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "tabular inline-flex items-center gap-0.5 font-medium",
                delta.sign === 0 ? "text-muted-foreground" : good ? "text-emerald-700" : "text-red-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {delta.text}
            </span>
            {deltaLabel && <span className="hidden sm:inline">{deltaLabel}</span>}
          </p>
        )}
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
