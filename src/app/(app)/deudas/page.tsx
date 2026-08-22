"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Landmark, Plus, Trash2 } from "lucide-react";
import { api, fetcher } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Progress,
} from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/format";

interface DebtDto {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  status: "ACTIVE" | "PAID";
  dueDate: string | null;
}

export default function DeudasPage() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ debts: DebtDto[] }>("/api/debts", fetcher
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DebtDto | null>(null);
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const list = data?.debts ?? [];
    return {
      active: list.filter((d) => d.status === "ACTIVE"),
      paid: list.filter((d) => d.status === "PAID"),
      totalDebt: list
        .filter((d) => d.status === "ACTIVE")
        .reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0),
    };
  }, [data]);

  function openCreate() {
    setEditing(null);
    setName("");
    setTotalAmount("");
    setPaidAmount("0");
    setDueDate("");
    setModalOpen(true);
  }

  function openEdit(debt: DebtDto) {
    setEditing(debt);
    setName(debt.name);
    setTotalAmount(String(debt.totalAmount));
    setPaidAmount(String(debt.paidAmount));
    setDueDate(debt.dueDate?.slice(0, 10) ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !totalAmount || Number(totalAmount) <= 0) {
      toast("Completa nombre y monto total", "error");
      return;
    }
    if (Number(paidAmount) > Number(totalAmount)) {
      toast("Lo pagado no puede superar el total", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        totalAmount: Number(totalAmount),
        paidAmount: Number(paidAmount) || 0,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
      };
      if (editing) {
        await api.patch(`/api/debts/${editing.id}`, payload);
        toast("Deuda actualizada", "success");
      } else {
        await api.post("/api/debts", payload);
        toast("Deuda creada", "success");
      }
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(debt: DebtDto) {
    try {
      await api.patch(`/api/debts/${debt.id}`, { paidAmount: debt.totalAmount });
      toast("¡Deuda pagada!", "success");
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  async function handleDelete(debt: DebtDto) {
    try {
      await api.delete(`/api/debts/${debt.id}`);
      toast("Deuda eliminada", "success");
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Deudas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pendiente: <span className="font-bold text-negative">{formatCurrency(summary.totalDebt)}</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          aria-label="Nueva deuda"
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.debts.length > 0 ? (
        <div className="space-y-3">
          {summary.active.map((debt) => (
            <DebtCard key={debt.id} debt={debt} onEdit={openEdit} onPay={markPaid} />
          ))}
          {summary.paid.length > 0 && (
            <>
              <h2 className="px-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Pagadas
              </h2>
              {summary.paid.map((debt) => (
                <Card key={debt.id} className="opacity-60">
                  <div className="flex items-center gap-3">
                    <Landmark className="size-5 shrink-0 text-positive" />
                    <p className="flex-1 truncate text-sm font-semibold line-through">{debt.name}</p>
                    <Badge tone="positive">pagada</Badge>
                    <button
                      onClick={() => openEdit(debt)}
                      aria-label={`Editar ${debt.name}`}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      editar
                    </button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Landmark className="size-5" />}
            title="Sin deudas registradas"
            hint="Lleva el control de préstamos y pagos pendientes."
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar deuda" : "Nueva deuda"}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="debt-name">Nombre</Label>
            <Input
              id="debt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Préstamo personal"
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="debt-total">Monto total</Label>
              <Input
                id="debt-total"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="debt-paid">Ya pagado</Label>
              <Input
                id="debt-paid"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="debt-due">Fecha límite (opcional)</Label>
            <Input
              id="debt-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
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
  );
}

function DebtCard({
  debt,
  onEdit,
  onPay,
}: {
  debt: DebtDto;
  onEdit: (d: DebtDto) => void;
  onPay: (d: DebtDto) => void;
}) {
  const pct = Math.min(100, (debt.paidAmount / debt.totalAmount) * 100);
  const overdue =
    debt.dueDate && debt.status === "ACTIVE" && new Date(debt.dueDate) < new Date();

  return (
    <Card>
      <button onClick={() => onEdit(debt)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">{debt.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatCurrency(debt.paidAmount)} de {formatCurrency(debt.totalAmount)}
              {debt.dueDate && ` · vence ${formatDate(debt.dueDate)}`}
            </p>
          </div>
          {overdue ? (
            <Badge tone="negative">vencida</Badge>
          ) : pct >= 100 ? (
            <Badge tone="positive">completada</Badge>
          ) : (
            <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-muted-foreground">
              {Math.round(pct)}%
            </span>
          )}
        </div>
        <Progress value={pct} tone={overdue ? "danger" : "primary"} className="mt-3" />
      </button>
      <Button variant="outline" size="sm" onClick={() => onPay(debt)} className="mt-3 w-full py-1.5 text-xs">
        Marcar como pagada
      </Button>
    </Card>
  );
}
