import type { TooltipProps } from "recharts";

/** Infobulle commune aux graphiques : texte en encre neutre, pastille de couleur pour l'identité. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  formatLabel,
}: TooltipProps<number, string> & { formatValue: (v: number) => string; formatLabel?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{formatLabel ? formatLabel(String(label)) : label}</p>
      {payload.map((p) => (
        <div key={p.dataKey as string} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="tabular ml-auto pl-3 font-medium text-foreground">{formatValue(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}
