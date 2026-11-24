import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import type { DailySales } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { ChartTooltip } from "@/components/common/ChartTooltip";
import { AXIS, GRID, SERIES } from "./theme";

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden>
            <line x1="0" y1="4" x2="16" y2="4" stroke={i.color} strokeWidth="2" strokeDasharray={i.dashed ? "4 3" : undefined} />
          </svg>
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function RevenueChart({ data, height = 280 }: { data: DailySales[]; height?: number }) {
  const { t } = useTranslation();
  const current = t("overview.current");
  const lastYear = t("overview.lastYear");
  return (
    <div>
      <ChartLegend
        items={[
          { label: current, color: SERIES.primary },
          { label: lastYear, color: SERIES.comparison, dashed: true },
        ]}
      />
      <div className="mt-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.primary} stopOpacity={0.14} />
                <stop offset="100%" stopColor={SERIES.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDate(d)}
              tickLine={false}
              axisLine={{ stroke: AXIS.stroke }}
              tick={AXIS.tick}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v, "XAF", { compact: true })}
              tickLine={false}
              axisLine={false}
              tick={AXIS.tick}
              width={72}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={<ChartTooltip formatValue={(v) => formatCurrency(v)} formatLabel={(d) => formatDate(d, { weekday: "short", day: "2-digit", month: "long" })} />}
            />
            <Area type="monotone" dataKey="revenue" name={current} stroke={SERIES.primary} strokeWidth={2} fill="url(#revFill)" animationDuration={600} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
            <Line
              type="monotone"
              dataKey="revenueLastYear"
              name={lastYear}
              stroke={SERIES.comparison}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              animationDuration={600}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
