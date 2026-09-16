"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/components/ui/toast";
import { Button, Card, EmptyState, Input, Label, Progress } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

export default function CicloPage() {
  const t = useTranslations("ciclo");
  const { data, error, refresh } = useWallet();
  const toast = useToast();

  const [salary, setSalary] = useState("");
  const [cycleStartDay, setCycleStartDay] = useState("1");
  const [saving, setSaving] = useState(false);
  // Hidrata el formulario solo la primera vez; no pisa lo que el usuario escribe
  // cuando SWR revalida en cada foco.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!data || hydrated.current) return;
    hydrated.current = true;
    setSalary(String(data.wallet.salary));
    setCycleStartDay(String(data.wallet.cycleStartDay));
  }, [data]);

  async function handleSave() {
    const s = Number(salary);
    const d = Number(cycleStartDay);
    if (isNaN(s) || s < 0) {
      toast(t("invalidSalary"), "error");
      return;
    }
    if (!Number.isInteger(d) || d < 1 || d > 28) {
      toast(t("invalidDay"), "error");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/api/wallet", { salary: s, cycleStartDay: d });
      toast(t("updated"), "success");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <Card>
        <EmptyState
          title={t("loadError")}
          hint={t("loadErrorHint")}
        />
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { wallet, summary } = data;

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* Estado actual */}
      <Card className="mb-5 bg-gradient-to-br from-emerald-600/10 to-transparent">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label={t("salary")} value={formatCurrency(wallet.salary)} />
          <Stat
            label={t("spent")}
            value={formatCurrency(summary.cycleExpenses)}
            tone="negative"
          />
          <Stat
            label={t("monthlySalary")}
            value={formatCurrency(summary.cycleRemaining)}
            tone={summary.cycleRemaining >= 0 ? "positive" : "negative"}
          />
        </div>
        {wallet.salary > 0 && (
          <div className="mt-4">
            <Progress
              value={summary.usedPct}
              tone={summary.usedPct >= 90 ? "danger" : summary.usedPct >= 70 ? "warning" : "primary"}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t("currentCycle", { elapsed: wallet.cycle.daysElapsed, total: wallet.cycle.daysTotal })} ·{" "}
              {Math.round(summary.usedPct)}% {t("consumed")}
            </p>
          </div>
        )}
      </Card>

      {/* Formulario */}
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="salary">{t("monthlySalary")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="salary"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="pl-8"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("salaryHint")}
            </p>
          </div>

          <div>
            <Label htmlFor="cycle-day">{t("cycleStartDay")}</Label>
            <Input
              id="cycle-day"
              aria-label={t("cycleStartDay")}
              type="number"
              min="1"
              max="28"
              step="1"
              value={cycleStartDay}
              onChange={(e) => setCycleStartDay(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("cycleStartHint")}
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t("saveChanges")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-[15px] font-extrabold tabular-nums ${
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
