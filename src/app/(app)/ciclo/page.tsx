"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/components/ui/toast";
import { Button, Card, EmptyState, Input, Label, Progress } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

export default function CicloPage() {
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
      toast("Salario inválido", "error");
      return;
    }
    if (!Number.isInteger(d) || d < 1 || d > 28) {
      toast("El día debe estar entre 1 y 28", "error");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/api/wallet", { salary: s, cycleStartDay: d });
      toast("Ciclo actualizado", "success");
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
          title="No se pudo cargar tu ciclo"
          hint="Revisa tu conexión e intenta de nuevo."
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
        <h1 className="text-2xl font-extrabold tracking-tight">Ciclo y presupuesto</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Define tu ingreso mensual y cuándo empieza cada ciclo
        </p>
      </header>

      {/* Estado actual */}
      <Card className="mb-5 bg-gradient-to-br from-emerald-600/10 to-transparent">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Salario" value={formatCurrency(wallet.salary)} />
          <Stat
            label="Gastado"
            value={formatCurrency(summary.cycleExpenses)}
            tone="negative"
          />
          <Stat
            label="Disponible"
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
              Ciclo actual: día {wallet.cycle.daysElapsed} de {wallet.cycle.daysTotal} ·{" "}
              {Math.round(summary.usedPct)}% consumido
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
            <Label htmlFor="salary">Salario mensual</Label>
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
              Se usa para calcular alertas al superar el 90% del presupuesto.
            </p>
          </div>

          <div>
            <Label htmlFor="cycle-day">Día de inicio del ciclo</Label>
            <Input
              id="cycle-day"
              aria-label="Día de inicio del ciclo"
              type="number"
              min="1"
              max="28"
              step="1"
              value={cycleStartDay}
              onChange={(e) => setCycleStartDay(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ej.: si eliges 15, cada ciclo va del 15 de un mes al 14 del siguiente.
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-sm font-extrabold tabular-nums ${
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
