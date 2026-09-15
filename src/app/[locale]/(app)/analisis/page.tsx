"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
              <Suspense
                fallback={
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <Charts chartData={chartData} dailySeries={data.analysis.dailySeries} totals={data.analysis.totals} transactionCount={data.analysis.transactionCount} subscriptionsMonthly={data.analysis.subscriptionsMonthly} />
              </Suspense>
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
