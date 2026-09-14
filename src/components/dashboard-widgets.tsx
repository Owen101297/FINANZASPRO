"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, KeyRound } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/use-wallet";
import { useSession } from "@/hooks/use-session";
import { Avatar } from "@/components/app-shell";
import { Badge, Progress } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

/** Encabezado de página con saludo y resumen del ciclo. */
export function DashboardGreeting() {
  const { user } = useSession();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const displayName = user?.name ?? user?.email.split("@")[0] ?? "";

  return (
    <div className="mb-6 flex items-center gap-3">
      <Avatar name={user?.name ?? user?.email ?? "?"} />
      <div>
        <p className="text-xs text-muted-foreground">{greeting}</p>
        <h1 className="text-lg font-extrabold capitalize tracking-tight">{displayName}</h1>
      </div>
    </div>
  );
}

/** Aviso para usuarios migrados que aún usan contraseña temporal. */
export function PasswordResetBanner() {
  const { user } = useSession();
  if (!user?.passwordReset) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <KeyRound className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <p className="font-bold text-warning">Contraseña temporal</p>
        <p className="mt-0.5 text-muted-foreground">
          Tu cuenta usa una contraseña temporal.{" "}
          <Link href="/cuenta" className="font-semibold underline underline-offset-2">
            Cámbiala ahora
          </Link>{" "}
          para proteger tus finanzas.
        </p>
      </div>
    </div>
  );
}

/** Banner de alerta cuando se supera el 90% del presupuesto. */
export function BudgetAlertBanner() {
  const { data } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  // Reset del dismiss al cambiar de ciclo
  useEffect(() => setDismissed(false), [data?.wallet.cycle.start]);

  if (!data || dismissed) return null;
  const { budgetAlert, usedPct, cycleRemaining } = data.summary;
  if (!budgetAlert) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <p className="font-bold text-warning">Alerta de presupuesto</p>
        <p className="mt-0.5 text-muted-foreground">
          Has usado el {Math.round(usedPct)}% de tu salario. Te queda{" "}
          {formatCurrency(Math.max(0, cycleRemaining))} en este ciclo.{" "}
          <Link href="/analisis" className="font-semibold underline underline-offset-2">
            Ver análisis
          </Link>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Descartar alerta"
        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

/** Tarjeta grande con balance total y progreso del ciclo. */
export function BalanceCard() {
  const { data, isLoading, error } = useWallet();

  if (error) {
    return (
      <section
        aria-label="Resumen financiero"
        className="rounded-card border border-border bg-card p-6 text-sm text-muted-foreground"
      >
        No se pudo cargar tu resumen.{" "}
        <Link href="/cuenta" className="font-semibold text-primary underline underline-offset-2">
          Reintenta desde tu cuenta
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
      aria-label="Resumen financiero"
      className="relative overflow-hidden rounded-card border border-border bg-gradient-to-br from-emerald-600/15 via-transparent to-violet-500/10 p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Balance total
          </p>
          <p className="mt-1 font-mono text-4xl font-extrabold tabular-nums tracking-tight">
            {formatCurrency(summary.totalBalance)}
          </p>
        </div>
        <Badge tone={summary.cycleRemaining >= 0 ? "positive" : "negative"}>
          Ciclo día {wallet.cycle.daysElapsed}/{wallet.cycle.daysTotal}
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Gastado este ciclo
          </p>
          <p className="mt-0.5 font-mono font-bold tabular-nums text-negative">
            −{formatCurrency(summary.cycleExpenses)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Disponible
          </p>
          <p
            className={`mt-0.5 font-mono font-bold tabular-nums ${
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
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {Math.round(summary.usedPct)}% de tu salario de {formatCurrency(wallet.salary)}
          </p>
        </div>
      )}
    </section>
  );
}
