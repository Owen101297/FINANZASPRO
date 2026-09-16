"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { Loader2, Plus, Pencil, Tags, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { api, fetcher } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
} from "@/components/ui/primitives";

interface CategoryDto {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string | null;
}

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#a78bfa", "#06b6d4", "#10b981"];

export default function CategoriasPage() {
  const t = useTranslations("categorias");
  const toast = useToast();
  const [tab, setTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const { data, isLoading, mutate } = useSWR<{ categories: CategoryDto[] }>("/api/categories", fetcher
  );

  const filtered = useMemo(
    () => (data?.categories ?? []).filter((c) => c.type === tab),
    [data, tab]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditing(null);
    setName("");
    setColor(COLORS[0]);
    setModalOpen(true);
  }

  function openEdit(category: CategoryDto) {
    setEditing(category);
    setName(category.name);
    setColor(category.color ?? COLORS[0]);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast(t("nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/categories/${editing.id}`, { name: name.trim(), color });
        toast(t("updated"), "success");
      } else {
        await api.post("/api/categories", { name: name.trim(), type: tab, color });
        toast(t("created"), "success");
      }
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: CategoryDto) {
    const ok = await confirm(t("confirmDelete"), t("confirmDeleteMsg", { name: category.name }));
    if (!ok) return;
    try {
      await api.delete(`/api/categories/${category.id}`);
      toast(t("deleted"), "success");
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("deleteError"), "error");
    }
  }

  return (
    <>
    <div className="animate-fade-in">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          aria-label={t("newCategory")}
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["EXPENSE", "INCOME"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            className={clsx(
              "rounded-lg py-2.5 text-[13px] font-bold transition-colors",
              tab === type ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {type === "EXPENSE" ? t("expenses") : t("incomes")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length > 0 ? (
        <Card className="divide-y divide-muted p-2">
          {filtered.map((category) => (
            <div key={category.id} className="group flex items-center gap-3 px-2 py-3">
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ backgroundColor: category.color ?? "#6b7280" }}
              />
              <span className="flex-1 truncate text-sm font-semibold">{category.name}</span>
              <button
                onClick={() => openEdit(category)}
                aria-label={`Editar ${category.name}`}
                className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => handleDelete(category)}
                aria-label={`Eliminar ${category.name}`}
                className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Tags className="size-5" />}
            title={tab === "INCOME" ? t("emptyIncomes") : t("emptyExpenses")}
            hint={t("emptyHint")}
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("editCategory") : tab === "INCOME" ? t("newIncomeCategory") : t("newExpenseCategory")}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="cat-name">{t("name")}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholderName")}
              maxLength={40}
              autoFocus
            />
          </div>

          <fieldset>
            <Label>{t("color")}</Label>
            <div className="flex flex-wrap gap-2.5">
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
              <Button variant="danger" onClick={() => handleDelete(editing)} aria-label={t("confirmDelete")}>
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
