import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/common/ChartTooltip";
import { AXIS, GRID, SERIES } from "./theme";

/** Barres horizontales à série unique (le titre de la carte nomme la mesure). */
export function HBarChart<T extends object>({
  data,
  labelKey,
  valueKey,
  valueName,
  format,
  formatTick,
  height,
}: {
  data: T[];
  labelKey: keyof T & string;
  valueKey: keyof T & string;
  valueName: string;
  format: (v: number) => string;
  formatTick?: (v: number) => string;
  height?: number;
}) {
  return (
    <div style={{ height: height ?? Math.max(160, data.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatTick ?? format} tickLine={false} axisLine={false} tick={AXIS.tick} />
          <YAxis type="category" dataKey={labelKey} tickLine={false} axisLine={false} tick={{ ...AXIS.tick, fill: "hsl(var(--foreground))" }} width={150} />
          <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} content={<ChartTooltip formatValue={format} />} />
          <Bar dataKey={valueKey} name={valueName} fill={SERIES.primary} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
