"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Plus, Repeat, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { api, fetcher } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Button, Card, EmptyState, Input, Label, Modal } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

interface SubscriptionDto {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  active: boolean;
  note: string | null;
  accountId: string | null;
  accountName: string | null;
}

export default function SuscripcionesPage() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ subscriptions: SubscriptionDto[] }>(
    "/api/subscriptions",
    fetcher
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionDto | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const { activeList, inactiveList, monthlyTotal } = useMemo(() => {
    const list = data?.subscriptions ?? [];
    return {
      activeList: list.filter((s) => s.active),
      inactiveList: list.filter((s) => !s.active),
      monthlyTotal: list.filter((s) => s.active).reduce((acc, s) => acc + s.amount, 0),
    };
  }, [data]);

  function openCreate() {
    setEditing(null);
    setName("");
    setAmount("");
    setBillingDay("1");
    setModalOpen(true);
  }

  function openEdit(subscription: SubscriptionDto) {
    setEditing(subscription);
    setName(subscription.name);
    setAmount(String(subscription.amount));
    setBillingDay(String(subscription.billingDay));
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !amount || Number(amount) <= 0) {
      toast("Completa nombre y monto", "error");
      return;
    }
    const day = Number(billingDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      toast("El día de cobro debe estar entre 1 y 31", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), amount: Number(amount), billingDay: day };
      if (editing) {
        await api.patch(`/api/subscriptions/${editing.id}`, payload);
        toast("Suscripción actualizada", "success");
      } else {
        await api.post("/api/subscriptions", payload);
        toast("Suscripción creada", "success");
      }
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(subscription: SubscriptionDto) {
    try {
      await api.patch(`/api/subscriptions/${subscription.id}`, { active: !subscription.active });
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  async function handleDelete(subscription: SubscriptionDto) {
    const ok = await confirm("Eliminar suscripción", `¿Eliminar "${subscription.name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await api.delete(`/api/subscriptions/${subscription.id}`);
      toast("Suscripción eliminada", "success");
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  function SubscriptionRow({ subscription }: { subscription: SubscriptionDto }) {
    return (
      <div className="flex items-center gap-3 px-2 py-3.5">
        <span
          aria-hidden
          className={clsx(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            subscription.active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Repeat className="size-4" />
        </span>
        <button onClick={() => openEdit(subscription)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold">{subscription.name}</p>
          <p className="text-xs text-muted-foreground">
            día {subscription.billingDay} de cada mes
          </p>
        </button>
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
          {formatCurrency(subscription.amount)}
        </span>
        <button
          onClick={() => toggleActive(subscription)}
          aria-label={subscription.active ? "Desactivar" : "Activar"}
          title={subscription.active ? "Desactivar" : "Activar"}
          className={clsx(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
            subscription.active ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={clsx(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
              subscription.active ? "left-[18px]" : "left-0.5"
            )}
          />
        </button>
        <button
          onClick={() => handleDelete(subscription)}
          aria-label={`Eliminar ${subscription.name}`}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Suscripciones</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Mensual activo:{" "}
            <span className="font-bold text-accent">{formatCurrency(monthlyTotal)}</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          aria-label="Nueva suscripción"
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.subscriptions.length > 0 ? (
        <div className="space-y-4">
          <Card className="divide-y divide-border p-1.5">
            {activeList.map((s) => (
              <SubscriptionRow key={s.id} subscription={s} />
            ))}
          </Card>

          {inactiveList.length > 0 && (
            <>
              <h2 className="px-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Inactivas
              </h2>
              <Card className="divide-y divide-border p-1.5 opacity-60">
                {inactiveList.map((s) => (
                  <SubscriptionRow key={s.id} subscription={s} />
                ))}
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Repeat className="size-5" />}
            title="Sin suscripciones"
            hint="Registra servicios mensuales como Netflix, Spotify o gym."
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar suscripción" : "Nueva suscripción"}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="sub-name">Nombre</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Netflix"
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-amount">Monto mensual</Label>
              <Input
                id="sub-amount"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sub-day">Día de cobro</Label>
              <Input
                id="sub-day"
                type="number"
                min="1"
                max="31"
                step="1"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {editing && (
              <Button variant="danger" onClick={() => handleDelete(editing)}>
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2]">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    {ConfirmDialog}
    </>
  );
}
