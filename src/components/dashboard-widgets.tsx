"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, KeyRound, TrendingUp, TrendingDown, Landmark, Tag, Check, Circle } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useWallet } from "@/hooks/use-wallet";
import { useSession } from "@/hooks/use-session";
import { Avatar } from "@/components/app-shell";
import { Badge, Card, Progress } from "@/components/ui/primitives";
import { fetcher } from "@/lib/client-api";
import { formatCurrency, currentMonth, shiftMonth } from "@/lib/format";
import { useTranslations, useLocale } from "next-intl";

export function DashboardGreeting() {
  const { user } = useSession();
  const t = useTranslations("dashboard");
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? t("greeting.morning") : hour < 19 ? t("greeting.afternoon") : t("greeting.night"));
  }, [t]);
  const displayName = user?.name ?? user?.email.split("@")[0] ?? "";

  return (
    <div className="mb-6 flex items-center gap-3">
      <Avatar name={user?.name ?? user?.email ?? "?"} />
      <div>
        <p className="text-[13px] text-muted-foreground">{greeting}</p>
        <h1 className="text-[22px] font-bold capitalize">{displayName}</h1>
      </div>
    </div>
  );
}

export function PasswordResetBanner() {
  const { user } = useSession();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  if (!user?.passwordReset) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl bg-warning/10 p-4">
      <KeyRound className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex-1 text-[15px]">
        <p className="font-semibold text-warning">{t("tempPasswordBanner")}</p>
        <p className="mt-0.5 text-muted-foreground">
          {t("tempPasswordText")}{" "}
          <Link href={`/${locale}/cuenta`} className="font-semibold underline underline-offset-2">
            {t("changeNow")}
          </Link>{" "}
          {t("toProtect")}
        </p>
      </div>
    </div>
  );
}

export function BudgetAlertBanner() {
  const { data } = useWallet();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => setDismissed(false), [data?.wallet.cycle.start]);

  if (!data || dismissed) return null;
  const { budgetAlert, usedPct, cycleRemaining } = data.summary;
  if (!budgetAlert) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl bg-warning/10 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex-1 text-[15px]">
        <p className="font-semibold text-warning">{t("budgetAlert")}</p>
        <p className="mt-0.5 text-muted-foreground">
          {t("budgetAlertText", { pct: String(Math.round(usedPct)), amount: formatCurrency(Math.max(0, cycleRemaining)) })}{" "}
          <Link href={`/${locale}/analisis`} className="font-semibold underline underline-offset-2">
            {t("viewAnalysis")}
          </Link>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t("dismissAlert")}
        className="text-[13px] font-semibold text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

export function BalanceCard() {
  const { data, isLoading, error } = useWallet();
  const locale = useLocale();
  const t = useTranslations("dashboard");

  if (error) {
    return (
      <section
        aria-label={t("financialSummary")}
        className="rounded-card bg-card p-6 text-[15px] text-muted-foreground shadow-sm"
      >
        {t("summaryError")}{" "}
        <Link href={`/${locale}/cuenta`} className="font-semibold text-primary underline underline-offset-2">
          {t("retryFromAccount")}
        </Link>
        .
      </section>
    );
  }

  if (isLoading || !data) {
    return <div className="h-44 animate-pulse rounded-card bg-muted" />;
  }

  const { summary, wallet } = data;
  const tone = summary.usedPct >= 90 ? "danger" : summary.usedPct >= 70 ? "warning" : "primary";

  return (
    <section
      aria-label={t("financialSummary")}
      className="relative overflow-hidden rounded-card bg-card p-6 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {t("totalBalance")}
          </p>
          <p className="mt-1 text-[34px] font-bold tabular-nums tracking-tight">
            {formatCurrency(summary.totalBalance)}
          </p>
        </div>
        <Badge tone={summary.cycleRemaining >= 0 ? "positive" : "negative"}>
          {t("cycleDay", { elapsed: String(wallet.cycle.daysElapsed), total: String(wallet.cycle.daysTotal) })}
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-[15px]">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {t("cycleSpent")}
          </p>
          <p className="mt-0.5 font-semibold tabular-nums text-negative">
            −{formatCurrency(summary.cycleExpenses)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-muted-foreground">
            {t("available")}
          </p>
          <p
            className={`mt-0.5 font-semibold tabular-nums ${
              summary.cycleRemaining >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatCurrency(summary.cycleRemaining)}
          </p>
        </div>
      </div>

      {wallet.salary > 0 && (
        <div className="mt-4">
          <Progress value={summary.usedPct} tone={tone} />
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {t("salaryUsed", { pct: String(Math.round(summary.usedPct)), amount: formatCurrency(wallet.salary) })}
          </p>
        </div>
      )}
    </section>
  );
}

type TxDto = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  category: { id: string; name: string; color: string | null } | null;
};

export function TopCategoryWidget() {
  const t = useTranslations("dashboard");
  const month = currentMonth();
  const { data, isLoading } = useSWR<{ transactions: TxDto[] }>(
    `/api/transactions?limit=200&month=${month}`,
    fetcher
  );

  const topCategory = useMemo(() => {
    if (!data?.transactions) return null;
    const expenses = data.transactions.filter(tx => tx.type === "EXPENSE" && tx.category);
    const byCategory = new Map<string, { name: string; color: string | null; total: number }>();
    for (const tx of expenses) {
      const cat = tx.category!;
      const existing = byCategory.get(cat.id);
      if (existing) existing.total += tx.amount;
      else byCategory.set(cat.id, { name: cat.name, color: cat.color, total: tx.amount });
    }
    const sorted = Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
    return sorted[0] ?? null;
  }, [data]);

  if (isLoading) return <div className="h-20 animate-pulse rounded-card bg-muted" />;
  if (!topCategory) return null;

  return (
    <section className="rounded-card bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Tag className="size-4 text-muted-foreground" />
        <h3 className="text-[13px] font-medium text-muted-foreground">
          {t("topCategory")}
        </h3>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: topCategory.color ?? "#6b7280" }}
          />
          <span className="text-[15px] font-semibold">{topCategory.name}</span>
        </div>
        <span className="text-[15px] font-semibold tabular-nums text-negative">
          −{formatCurrency(topCategory.total)}
        </span>
      </div>
    </section>
  );
}

export function DebtsSummaryWidget() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data, isLoading } = useSWR<{ debts: Array<{ id: string; totalAmount: number; paidAmount: number; status: string }> }>(
    "/api/debts",
    fetcher
  );

  const summary = useMemo(() => {
    if (!data?.debts) return null;
    const active = data.debts.filter(d => d.status === "ACTIVE");
    if (active.length === 0) return null;
    const totalDebt = active.reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);
    return { count: active.length, total: totalDebt };
  }, [data]);

  if (isLoading) return <div className="h-20 animate-pulse rounded-card bg-muted" />;
  if (!summary) return null;

  return (
    <section className="rounded-card bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <h3 className="text-[13px] font-medium text-muted-foreground">
            {t("activeDebts")}
          </h3>
        </div>
        <Link
          href={`/${locale}/deudas`}
          className="text-[13px] font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[15px] font-semibold">
          {summary.count} {summary.count === 1 ? t("debt") : t("debts")}
        </span>
        <span className="text-[15px] font-semibold tabular-nums text-negative">
          −{formatCurrency(summary.total)}
        </span>
      </div>
    </section>
  );
}

export function MonthlyTrendWidget() {
  const t = useTranslations("dashboard");
  const thisMonth = currentMonth();
  const lastMonth = shiftMonth(thisMonth, -1);

  const { data: thisData } = useSWR<{ transactions: TxDto[] }>(
    `/api/transactions?limit=200&month=${thisMonth}`,
    fetcher
  );
  const { data: lastData } = useSWR<{ transactions: TxDto[] }>(
    `/api/transactions?limit=200&month=${lastMonth}`,
    fetcher
  );

  const trend = useMemo(() => {
    if (!thisData?.transactions || !lastData?.transactions) return null;
    const thisExpenses = thisData.transactions
      .filter(tx => tx.type === "EXPENSE")
      .reduce((acc, tx) => acc + tx.amount, 0);
    const lastExpenses = lastData.transactions
      .filter(tx => tx.type === "EXPENSE")
      .reduce((acc, tx) => acc + tx.amount, 0);
    if (lastExpenses === 0) return null;
    const diff = thisExpenses - lastExpenses;
    const pct = (diff / lastExpenses) * 100;
    return { diff, pct, thisExpenses, lastExpenses };
  }, [thisData, lastData]);

  if (!trend) return null;

  const isUp = trend.diff > 0;

  return (
    <section className="rounded-card bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {isUp ? (
          <TrendingUp className="size-4 text-negative" />
        ) : (
          <TrendingDown className="size-4 text-positive" />
        )}
        <h3 className="text-[13px] font-medium text-muted-foreground">
          {t("monthlyTrend")}
        </h3>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[15px] font-semibold">
          {isUp ? "+" : ""}{Math.round(trend.pct)}%
        </span>
        <span className={`text-[13px] font-medium ${isUp ? "text-negative" : "text-positive"}`}>
          {isUp ? t("spendUp") : t("spendDown")} {formatCurrency(Math.abs(trend.diff))}
        </span>
      </div>
    </section>
  );
}

interface OnboardingStep {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({
  accountCount,
  categoryCount,
  salary,
  transactionCount,
  locale,
}: {
  accountCount: number;
  categoryCount: number;
  salary: number;
  transactionCount: number;
  locale: string;
}) {
  const t = useTranslations("dashboard");
  const [dismissed, setDismissed] = useState(false);

  const steps: OnboardingStep[] = useMemo(
    () => [
      { key: "account", label: t("onboarding.createAccount"), href: `/${locale}/cuentas`, done: accountCount > 0 },
      { key: "salary", label: t("onboarding.setSalary"), href: `/${locale}/ciclo`, done: salary > 0 },
      { key: "category", label: t("onboarding.createCategory"), href: `/${locale}/categorias`, done: categoryCount > 0 },
      { key: "transaction", label: t("onboarding.firstTransaction"), href: `/${locale}/transacciones?new=gasto`, done: transactionCount > 0 },
    ],
    [accountCount, categoryCount, salary, transactionCount, locale, t]
  );

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (allDone || dismissed) return null;

  return (
    <Card className="mb-5 bg-primary/5 p-4 shadow-none">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{t("onboarding.title")}</h3>
        <span className="text-[13px] text-muted-foreground">{completedCount}/{steps.length}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[15px] transition-colors hover:bg-muted"
            >
              {step.done ? (
                <Check className="size-4 shrink-0 text-positive" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className={step.done ? "text-muted-foreground line-through" : "font-medium"}>
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setDismissed(true)}
        className="mt-3 w-full text-center text-[13px] text-muted-foreground hover:text-foreground"
      >
        {t("onboarding.dismiss")}
      </button>
    </Card>
  );
}
