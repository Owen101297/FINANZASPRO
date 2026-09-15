import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/primitives";

interface ChartEntry {
  name: string;
  color: string | null;
  total: number;
  pct: number;
  fill?: string;
}

interface ChartsProps {
  chartData: ChartEntry[];
  dailySeries: Array<{ day: number; total: number }>;
  totals: { income: number; expense: number; net: number; salary: number };
  transactionCount: number;
  subscriptionsMonthly: number;
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--foreground)",
};

export default function Charts({
  chartData,
  dailySeries,
  totals,
  transactionCount,
  subscriptionsMonthly,
}: ChartsProps) {
  return (
    <>
      <div className="relative mx-auto mt-2 h-56 max-w-xs">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="total"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill ?? "#8b5cf6"} />
              ))}
            </Pie>
            <ChartTooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
          <span className="font-mono text-xl font-extrabold">
            {formatCurrency(totals.expense)}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {chartData.map((c) => (
          <li key={c.name} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.fill ?? "#8b5cf6" }}
            />
            <span className="flex-1 truncate">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.pct}%</span>
            <span className="w-24 shrink-0 text-right font-mono text-xs font-bold tabular-nums">
              {formatCurrency(c.total)}
            </span>
          </li>
        ))}
      </ul>

      <Card className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Gasto por día
        </h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySeries}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis hide />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                formatter={(value) => [formatCurrency(Number(value)), "Gasto"]}
                labelFormatter={(day) => `Día ${day}`}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {transactionCount} movimientos · suscripciones activas{" "}
          {formatCurrency(subscriptionsMonthly)}/mes
        </p>
      </Card>
    </>
  );
}
