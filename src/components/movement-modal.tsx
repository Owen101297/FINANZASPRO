"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "@/hooks/use-wallet";
import { useConfirm } from "@/hooks/use-confirm";
import { Button, Input, Label, Modal, Select } from "@/components/ui/primitives";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";

type Mode = "gasto" | "ingreso" | "transferencia";

export interface MovementModalState {
  open: boolean;
  mode?: Mode;
  editTxId?: string;
  prefill?: {
    amount?: string;
    categoryId?: string;
    accountId?: string;
    note?: string;
    date?: string;
  };
}

function todayLocalISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function MovementModal({
  state,
  onClose,
}: {
  state: MovementModalState;
  onClose: () => void;
}) {
  const { data: walletData, refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const t = useTranslations("movement");
  const tCommon = useTranslations("common");

  const [mode, setMode] = useState<Mode>(state.mode ?? "gasto");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [saving, setSaving] = useState(false);

  // Sincroniza con el estado externo SOLO al abrirse o al cambiar de registro
  // (no en cada re-render del padre, que pisaría lo que el usuario escribe).
  useEffect(() => {
    if (!state.open) return;
    setMode(state.mode ?? "gasto");
    setAmount(state.prefill?.amount ?? "");
    setCategoryId(state.prefill?.categoryId ?? "");
    setAccountId(state.prefill?.accountId ?? "");
    setToAccountId("");
    setNote(state.prefill?.note ?? "");
    setDate(state.prefill?.date ?? todayLocalISO());
  }, [state.open, state.editTxId, state.mode, state.prefill?.amount, state.prefill?.accountId, state.prefill?.categoryId, state.prefill?.note, state.prefill?.date]);

  const activeAccounts = useMemo(
    () => walletData?.accounts.filter((a) => !a.archived) ?? [],
    [walletData]
  );
  const categories = useMemo(
    () =>
      (walletData?.categories ?? []).filter((c) =>
        mode === "ingreso" ? c.type === "INCOME" : c.type === "EXPENSE"
      ),
    [walletData, mode]
  );

  const isTransfer = mode === "transferencia";

  async function handleSave() {
    const amountNum = Number(amount);
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast(t("invalidAmount"), "error");
      return;
    }
    if (!date) {
      toast(t("selectDate"), "error");
      return;
    }

    setSaving(true);
    try {
      if (isTransfer) {
        if (!accountId || !toAccountId) throw new Error(t("selectBothAccounts"));
        if (accountId === toAccountId) throw new Error(t("differentAccounts"));
        await api.post("/api/transfers", {
          fromAccountId: accountId,
          toAccountId,
          amount: amountNum,
          note: note.trim() || undefined,
          date: new Date(`${date}T12:00:00`).toISOString(),
        });
        toast(t("registeredTransfer"), "success");
      } else {
        const payload = {
          type: mode === "ingreso" ? ("INCOME" as const) : ("EXPENSE" as const),
          amount: amountNum,
          note: note.trim() || null,
          accountId: accountId || null,
          categoryId: categoryId || null,
          date: new Date(`${date}T12:00:00`).toISOString(),
        };
        if (state.editTxId) {
          await api.patch(`/api/transactions/${state.editTxId}`, payload);
          toast(t("updated"), "success");
        } else {
          await api.post("/api/transactions", payload);
          toast(
            payload.type === "INCOME" ? t("registeredIncome") : t("registeredExpense"),
            "success"
          );
        }
      }
      refreshWallet();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!state.editTxId) return;
    const ok = await confirm(t("confirmDelete"), t("confirmDeleteMsg"));
    if (!ok) return;
    setSaving(true);
    try {
      await api.delete(`/api/transactions/${state.editTxId}`);
      toast(t("deleted"), "success");
      refreshWallet();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("deleteError"), "error");
    } finally {
      setSaving(false);
    }
  }

  const accentClass =
    mode === "gasto"
      ? "border-rose-500/40 focus:border-rose-500 text-negative"
      : mode === "ingreso"
        ? "border-emerald-500/40 focus:border-emerald-500 text-positive"
        : "border-sky-500/40 focus:border-sky-500 text-sky-500";

  const title =
    state.editTxId ? t("editMovement") : isTransfer ? t("newTransfer") : mode === "gasto" ? t("newExpense") : t("newIncome");

  return (
    <>
    <Modal open={state.open} onClose={onClose} title={title}>
      {!state.editTxId && (
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {(["gasto", "ingreso", "transferencia"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                "rounded-lg py-2 text-xs font-bold capitalize transition-colors",
                mode === m ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "gasto" ? t("expense") : m === "ingreso" ? t("income") : t("transfer")}
            </button>
          ))}
        </div>
      )}

      {/* Monto */}
      <div className="mb-4">
        <Label htmlFor="movement-amount">{tCommon("amount")}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-light text-muted-foreground">
            $
          </span>
          <Input
            id="movement-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            className={clsx("h-16 border bg-background pl-10 text-center text-3xl font-bold", accentClass)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-3.5">
        {!isTransfer && (
          <div>
            <Label htmlFor="movement-category">{t("category")}</Label>
            <Select
              id="movement-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{tCommon("noCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="movement-account">{isTransfer ? t("from") : t("account")}</Label>
          <Select
            id="movement-account"
            value={accountId}
            onChange={(e) => {
              const v = e.target.value;
              setAccountId(v);
              if (v === toAccountId) setToAccountId("");
            }}
          >
            <option value="">{t("noAccount")}</option>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        {isTransfer && (
          <div>
            <Label htmlFor="movement-to">{t("to")}</Label>
            <Select
              id="movement-to"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              <option value="">{t("selectDestAccount")}</option>
              {activeAccounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="movement-date">{tCommon("date")}</Label>
          <Input
            id="movement-date"
            type="date"
            max={todayLocalISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="movement-note">{tCommon("note")}</Label>
          <Input
            id="movement-note"
            type="text"
            maxLength={200}
            placeholder={tCommon("optional")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {state.editTxId && (
          <Button variant="danger" onClick={handleDelete} disabled={saving} aria-label={t("confirmDelete")}>
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-[2]">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
    </Modal>
    {ConfirmDialog}
    </>
  );
}
