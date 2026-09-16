"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/client-api";
import { currentMonth, formatCurrency, monthLabel, shiftMonth } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";

const Charts = lazy(() => import("./charts"));

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
  const t = useTranslations("analisis");
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading } = useSWR<AnalysisData>(`/api/analytics?month=${month}`, fetcher);

  const lastMonth = shiftMonth(month, -1);
  const { data: lastData } = useSWR<AnalysisData>(`/api/analytics?month=${lastMonth}`, fetcher);

  const chartData = useMemo(
    () =>
      (data?.analysis.byCategory ?? []).map((c, i) => ({
        ...c,
        fill: c.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
    [data]
  );

  const comparison = useMemo(() => {
    if (!data?.analysis.totals || !lastData?.analysis.totals) return null;
    const thisExp = data.analysis.totals.expense;
    const lastExp = lastData.analysis.totals.expense;
    if (lastExp === 0) return null;
    const diff = thisExp - lastExp;
    const pct = (diff / lastExp) * 100;
    return { diff, pct, isUp: diff > 0 };
  }, [data, lastData]);

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} subtitle={monthLabel(month)} />

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
                    {i === 0 ? t("diagnosis") : t("recommendation")}
                  </div>
                  <p className="text-foreground">{insight.message}</p>
                </div>
              ))}
            </section>
          )}

          {/* Totales */}
          <section aria-label="Totales" className="mb-6 grid grid-cols-3 gap-3">
            <TotalCard label={t("income")} value={data.analysis.totals.income} tone="positive" />
            <TotalCard label={t("expense")} value={data.analysis.totals.expense} tone="negative" />
            <TotalCard label={t("net")} value={data.analysis.totals.net} />
          </section>

          {/* Comparativa mensual */}
          {comparison && (
            <Card className="mb-6 p-4">
              <div className="flex items-center gap-2">
                {comparison.isUp ? (
                  <TrendingUp className="size-4 text-negative" />
                ) : (
                  <TrendingDown className="size-4 text-positive" />
                )}
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("vsLastMonth")}
                </h3>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold">
                  {comparison.isUp ? "+" : ""}{Math.round(comparison.pct)}%
                </span>
                <span className={clsx("text-xs font-semibold", comparison.isUp ? "text-negative" : "text-positive")}>
                  {comparison.isUp ? t("moreSpending") : t("lessSpending")} {formatCurrency(Math.abs(comparison.diff))}
                </span>
              </div>
            </Card>
          )}

          {/* Distribución por categoría */}
          <Card className="mb-6">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("expenseDistribution")}
            </h2>

            {chartData.length === 0 ? (
              <EmptyState
                title={t("noExpenses")}
                hint={t("noExpensesHint")}
              />
            ) : (
              <>
                {/* Category bars */}
                <div className="mt-3 space-y-3">
                  {chartData.map((cat) => (
                    <div key={cat.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.fill ?? "#8b5cf6" }}
                          />
                          <span className="truncate font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{cat.pct}%</span>
                          <span className="w-20 text-right font-mono text-xs font-bold tabular-nums">
                            {formatCurrency(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${cat.pct}%`, backgroundColor: cat.fill ?? "#8b5cf6" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Suspense
                  fallback={
                    <div className="flex justify-center py-10">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  <Charts chartData={chartData} dailySeries={data.analysis.dailySeries} totals={data.analysis.totals} transactionCount={data.analysis.transactionCount} subscriptionsMonthly={data.analysis.subscriptionsMonthly} />
                </Suspense>
              </>
            )}
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
