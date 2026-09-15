"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, CalendarClock, DollarSign, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, fetcher } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { Card, EmptyState, Button } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

interface DebtDto {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  status: "ACTIVE" | "PAID";
  dueDate: string | null;
}

export default function PlanPagosPage() {
  const t = useTranslations("planPagos");
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ debts: DebtDto[] }>("/api/debts", fetcher);

  const [paymentModal, setPaymentModal] = useState<DebtDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const activeDebts = useMemo(
    () => (data?.debts ?? []).filter((d) => d.status === "ACTIVE"),
    [data]
  );

  const summary = useMemo(() => {
    const totalDebt = activeDebts.reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);
    const now = new Date();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const overdue = activeDebts.filter(
      (d) => d.dueDate && new Date(d.dueDate) < now
    );
    const dueThisMonth = activeDebts.filter((d) => {
      if (!d.dueDate) return false;
      const due = new Date(d.dueDate);
      return due >= now && due <= currentMonthEnd;
    });
    return {
      totalDebt,
      overdueCount: overdue.length,
      dueThisMonthCount: dueThisMonth.length,
      dueThisMonthAmount: dueThisMonth.reduce(
        (acc, d) => acc + (d.totalAmount - d.paidAmount),
        0
      ),
    };
  }, [activeDebts]);

  const schedule = useMemo(() => {
    const now = new Date();
    const months: { label: string; debts: DebtDto[]; total: number }[] = [];

    // Group debts by month
    for (const debt of activeDebts) {
      if (!debt.dueDate) continue;
      const due = new Date(debt.dueDate);
      const monthKey = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`;
      const remaining = debt.totalAmount - debt.paidAmount;

      const existing = months.find((m) => m.label === monthKey);
      if (existing) {
        existing.debts.push(debt);
        existing.total += remaining;
      } else {
        months.push({
          label: monthKey,
          debts: [debt],
          total: remaining,
        });
      }
    }

    return months
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter((m) => m.label >= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  }, [activeDebts]);

  async function handlePayment() {
    if (!paymentModal || !paymentAmount || Number(paymentAmount) <= 0) return;
    const remaining = paymentModal.totalAmount - paymentModal.paidAmount;
    const amount = Math.min(Number(paymentAmount), remaining);

    setSaving(true);
    try {
      await api.patch(`/api/debts/${paymentModal.id}`, {
        paidAmount: paymentModal.paidAmount + amount,
      });
      toast(t("paymentRecorded", { amount: formatCurrency(amount) }), "success");
      setPaymentModal(null);
      setPaymentAmount("");
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeDebts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="size-5" />}
            title={t("empty")}
            hint={t("emptyHint")}
          />
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="size-4" />
                <span className="text-xs font-medium">{t("totalDebt")}</span>
              </div>
              <p className="mt-1 font-mono text-lg font-bold text-negative">
                {formatCurrency(summary.totalDebt)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="size-4" />
                <span className="text-xs font-medium">{t("dueThisMonth")}</span>
              </div>
              <p className="mt-1 font-mono text-lg font-bold">
                {summary.dueThisMonthCount} · {formatCurrency(summary.dueThisMonthAmount)}
              </p>
            </Card>
          </div>

          {summary.overdueCount > 0 && (
            <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">
                {t("overdueWarning", { count: summary.overdueCount })}
              </p>
            </Card>
          )}

          {/* Payment schedule */}
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("schedule")}
          </h2>
          <div className="space-y-3">
            {schedule.map((month) => (
              <Card key={month.label} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">{formatMonthLabel(month.label)}</h3>
                  <span className="font-mono text-xs font-semibold text-negative">
                    {formatCurrency(month.total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {month.debts.map((debt) => {
                    const remaining = debt.totalAmount - debt.paidAmount;
                    const pct = Math.min(100, (debt.paidAmount / debt.totalAmount) * 100);
                    return (
                      <div key={debt.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{debt.name}</p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {formatCurrency(remaining)}
                        </span>
                        <button
                          onClick={() => {
                            setPaymentModal(debt);
                            setPaymentAmount(String(Math.ceil(remaining)));
                          }}
                          className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          {t("pay")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Payment modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPaymentModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl animate-scale-in">
            <h3 className="mb-1 text-lg font-bold">{t("makePayment")}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{paymentModal.name}</p>
            <div className="mb-4 rounded-xl bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("remaining")}</p>
              <p className="font-mono text-xl font-bold">
                {formatCurrency(paymentModal.totalAmount - paymentModal.paidAmount)}
              </p>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("paymentAmount")}
              </label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentModal.totalAmount - paymentModal.paidAmount}
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm font-mono focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPaymentModal(null)} disabled={saving} className="flex-1">
                {t("common.cancel")}
              </Button>
              <Button onClick={handlePayment} disabled={saving || !paymentAmount || Number(paymentAmount) <= 0} className="flex-1">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {t("confirmPayment")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, 1);
  return date.toLocaleDateString("es", { month: "long", year: "numeric" });
}
