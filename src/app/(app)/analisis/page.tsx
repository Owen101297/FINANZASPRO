"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
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
import { clsx } from "clsx";
import { fetcher } from "@/lib/client-api";
import { currentMonth, formatCurrency, monthLabel, shiftMonth } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";

interface InsightDto {
  kind: "positive" | "warning" | "danger" | "info";
  message: string;
}

interface AnalysisData {
  analysis: {
    month: string;
    totals: { income: number; expense: number; net: number; salary: number };
    byCategory: Array<{ name: string; color: string | null; total: number; pct: number }>;
    dailySeries: Array<{ day: number; total: number }>;
    subscriptionsMonthly: number;
    transactionCount: number;
  };
  insights: InsightDto[];
}

const FALLBACK_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#ec4899", "#10b981", "#06b6d4", "#ef4444"];

const insightStyles: Record<InsightDto["kind"], string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  warning: "border-amber-500/30 bg-amber-500/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-500",
};

export default function AnalisisPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading } = useSWR<AnalysisData>(`/api/analytics?month=${month}`, fetcher
  );

  const chartData = useMemo(
    () =>
      (data?.analysis.byCategory ?? []).map((c, i) => ({
        ...c,
        fill: c.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
    [data]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Análisis inteligente" subtitle={monthLabel(month)} />

      {/* Selector de mes */}
      <div className="mb-5 flex items-center justify-between rounded-card border border-border bg-card px-3 py-2.5">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label="Mes anterior"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-bold capitalize">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          aria-label="Mes siguiente"
          disabled={month >= currentMonth()}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Diagnóstico */}
          {data.insights.length > 0 && (
            <section aria-label="Diagnóstico" className="mb-6 space-y-2.5">
              {data.insights.map((insight, i) => (
                <div
                  key={`${month}-${i}`}
                  className={clsx("rounded-2xl border p-4 text-sm leading-relaxed", insightStyles[insight.kind])}
                >
                  <div className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Brain className="size-3.5" />
                    {i === 0 ? "Diagnóstico del mes" : "Recomendación"}
                  </div>
                  <p className="text-foreground">{insight.message}</p>
                </div>
              ))}
            </section>
          )}

          {/* Totales */}
          <section aria-label="Totales" className="mb-6 grid grid-cols-3 gap-3">
            <TotalCard label="Ingresos" value={data.analysis.totals.income} tone="positive" />
            <TotalCard label="Gastos" value={data.analysis.totals.expense} tone="negative" />
            <TotalCard label="Neto" value={data.analysis.totals.net} />
          </section>

          {/* Distribución por categoría */}
          <Card className="mb-6">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Distribución de gastos
            </h2>

            {chartData.length === 0 ? (
              <EmptyState
                title="Sin gastos este mes"
                hint="Cuando registres gastos verás aquí su distribución."
              />
            ) : (
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
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="font-mono text-xl font-extrabold">
                      {formatCurrency(data.analysis.totals.expense)}
                    </span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {chartData.map((c) => (
                    <li key={c.name} className="flex items-center gap-2.5 text-sm">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.fill }}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.pct}%</span>
                      <span className="w-24 shrink-0 text-right font-mono text-xs font-bold tabular-nums">
                        {formatCurrency(c.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {/* Gasto diario */}
          <Card>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Gasto por día
            </h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.analysis.dailySeries}>
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
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {data.analysis.transactionCount} movimientos · suscripciones activas{" "}
              {formatCurrency(data.analysis.subscriptionsMonthly)}/mes
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function TotalCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "positive" | "negative";
}) {
  return (
    <Card className="p-3.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={clsx(
          "mt-1 truncate font-mono text-base font-extrabold tabular-nums",
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""
        )}
      >
        {formatCurrency(value)}
      </p>
    </Card>
  );
}
