"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { Loader2, Plus, Wallet as WalletIcon, Pencil, Trash2 } from "lucide-react";
import { api, fetcher } from "@/lib/client-api";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
} from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

interface AccountDto {
  id: string;
  name: string;
  balance: number;
  color: string | null;
  archived: boolean;
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function CuentasPage() {
  const t = useTranslations("cuentas");
  const { refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ accounts: AccountDto[] }>("/api/accounts", fetcher
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountDto | null>(null);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("0");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditing(null);
    setName("");
    setBalance("0");
    setColor(COLORS[0]);
    setModalOpen(true);
  }

  function openEdit(account: AccountDto) {
    setEditing(account);
    setName(account.name);
    setBalance(String(account.balance));
    setColor(account.color ?? COLORS[0]);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast(t("nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), balance: Number(balance) || 0, color };
      if (editing) {
        // Al editar solo cambia nombre/color; el balance se ajusta con movimientos
        await api.patch(`/api/accounts/${editing.id}`, {
          name: payload.name,
          color: payload.color,
        });
        toast(t("updated"), "success");
      } else {
        await api.post("/api/accounts", payload);
        toast(t("created"), "success");
      }
      setModalOpen(false);
      mutate();
      refreshWallet();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account: AccountDto) {
    const ok = await confirm(t("confirmDelete"), t("confirmDeleteMsg", { name: account.name }));
    if (!ok) return;
    setSaving(true);
    try {
      await api.delete(`/api/accounts/${account.id}`);
      toast(t("deleted"), "success");
      setModalOpen(false);
      mutate();
      refreshWallet();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("deleteError"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(account: AccountDto) {
    try {
      await api.patch(`/api/accounts/${account.id}`, { archived: !account.archived });
      mutate();
      refreshWallet();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("deleteError"), "error");
    }
  }

  return (
    <>
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          aria-label={t("newAccount")}
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.accounts.length > 0 ? (
        <div className="space-y-3">
          {data.accounts.map((account) => (
            <Card key={account.id} className={account.archived ? "opacity-60" : undefined}>
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: account.color ?? "#10b981" }}
                >
                  <WalletIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-bold">{account.name}</h2>
                    {account.archived && <Badge>{t("archived")}</Badge>}
                  </div>
                  <p className="font-mono text-lg font-extrabold tabular-nums">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => openEdit(account)}
                    aria-label={`Editar ${account.name}`}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => toggleArchive(account)}
                    className="rounded-lg px-1 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {account.archived ? t("restore") : t("archive")}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<WalletIcon className="size-5" />}
            title={t("empty")}
            hint={t("emptyHint")}
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("editAccount") : t("newAccount")}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="acc-name">{t("name")}</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholderName")}
              maxLength={40}
              autoFocus
            />
          </div>

          {!editing && (
            <div>
              <Label htmlFor="acc-balance">{t("initialBalance")}</Label>
              <Input
                id="acc-balance"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
          )}

          <fieldset>
            <Label>{t("color")}</Label>
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={
                    "size-8 rounded-full ring-offset-2 ring-offset-card transition-all " +
                    (color === c ? "ring-2 ring-ring scale-110" : "")
                  }
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3 pt-2">
            {editing && (
              <Button variant="danger" onClick={() => handleDelete(editing)} disabled={saving}>
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2]">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    {ConfirmDialog}
    </>
  );
}
