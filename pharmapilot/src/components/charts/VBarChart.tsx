import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/common/ChartTooltip";
import { AXIS, GRID, SERIES } from "./theme";

export function VBarChart<T extends object>({
  data,
  labelKey,
  valueKey,
  valueName,
  format,
  height = 240,
}: {
  data: T[];
  labelKey: keyof T & string;
  valueKey: keyof T & string;
  valueName: string;
  format: (v: number) => string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap={4}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey={labelKey} tickLine={false} axisLine={{ stroke: AXIS.stroke }} tick={AXIS.tick} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={AXIS.tick} tickFormatter={format} />
          <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} content={<ChartTooltip formatValue={format} />} />
          <Bar dataKey={valueKey} name={valueName} fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
