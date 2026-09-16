"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, fetcher } from "@/lib/client-api";
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
  Progress,
} from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/format";

interface GoalDto {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  completedAt: string | null;
}

export default function MetasPage() {
  const t = useTranslations("metas");
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ goals: GoalDto[] }>("/api/goals", fetcher
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoalDto | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const { activeGoals, completedGoals } = useMemo(() => {
    const list = data?.goals ?? [];
    return {
      activeGoals: list.filter((g) => !g.completedAt),
      completedGoals: list.filter((g) => g.completedAt),
    };
  }, [data]);

  function openCreate() {
    setEditing(null);
    setName("");
    setTargetAmount("");
    setSavedAmount("0");
    setDeadline("");
    setModalOpen(true);
  }

  function openEdit(goal: GoalDto) {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setSavedAmount(String(goal.savedAmount));
    setDeadline(goal.deadline?.slice(0, 10) ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) {
      toast(t("nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        savedAmount: Number(savedAmount) || 0,
        deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
      };
      if (editing) {
        await api.patch(`/api/goals/${editing.id}`, payload);
        toast(t("updated"), "success");
      } else {
        await api.post("/api/goals", payload);
        toast(t("created"), "success");
      }
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addProgress(goal: GoalDto, delta: number) {
    try {
      await api.patch(`/api/goals/${goal.id}`, {
        savedAmount: Math.max(0, goal.savedAmount + delta),
      });
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  async function handleDelete(goal: GoalDto) {
    const ok = await confirm(t("confirmDelete"), t("confirmDeleteMsg", { name: goal.name }));
    if (!ok) return;
    try {
      await api.delete(`/api/goals/${goal.id}`);
      toast(t("deleted"), "success");
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  return (
    <>
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("completedCount", { count: completedGoals.length })} ·{" "}
            {activeGoals.length} {t("inProgress")}
          </p>
        </div>
        <button
          onClick={openCreate}
          aria-label={t("newGoal")}
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.goals.length > 0 ? (
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={openEdit} onAdd={addProgress} />
          ))}
          {completedGoals.length > 0 && (
            <>
              <h2 className="px-1 pt-4 text-[13px] font-bold text-muted-foreground">
                {t("completed")}
              </h2>
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="p-4 bg-positive/5 opacity-80">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-positive/15 text-positive">
                      <Target className="size-4" />
                    </span>
                    <p className="flex-1 truncate text-sm font-bold">{goal.name}</p>
                    <Badge tone="positive">{t("achieved")}</Badge>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : (
        <Card className="p-4">
          <EmptyState
            icon={<Target className="size-5" />}
            title={t("empty")}
            hint={t("emptyHint")}
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("editGoal") : t("newGoalTitle")}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-name">{t("common.name")}</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholderName")}
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="goal-target">{t("targetAmount")}</Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="goal-saved">{t("saved")}</Label>
              <Input
                id="goal-saved"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="goal-deadline">{t("dueDate")}</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            {editing && (
              <Button variant="danger" onClick={() => handleDelete(editing)} aria-label={t("confirmDelete")}>
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving} className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2]">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    {ConfirmDialog}
    </>
  );
}

function GoalCard({
  goal,
  onEdit,
  onAdd,
}: {
  goal: GoalDto;
  onEdit: (g: GoalDto) => void;
  onAdd: (g: GoalDto, delta: number) => void;
}) {
  const t = useTranslations("metas");
  const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - goal.savedAmount;
  const late = goal.deadline && new Date(goal.deadline) < new Date();

  return (
    <Card className="p-4">
      <button onClick={() => onEdit(goal)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-medium">{goal.name}</h2>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {t("remaining")}{" "}
              <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
              {goal.deadline && ` · ${t("dueDateText", { date: formatDate(goal.deadline) })}`}
            </p>
          </div>
          <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-primary">
            {Math.round(pct)}%
          </span>
        </div>
        <Progress value={pct} tone={late ? "warning" : "primary"} className="mt-3" />
        <p className="mt-1.5 text-[13px] tabular-nums text-muted-foreground">
          {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}
        </p>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="py-1.5 text-xs" onClick={() => onAdd(goal, -10)}>
          −10
        </Button>
        <Button variant="outline" size="sm" className="py-1.5 text-xs" onClick={() => onAdd(goal, 10)}>
          +10
        </Button>
        <Button size="sm" className="py-1.5 text-xs" onClick={() => onAdd(goal, 50)}>
          +50
        </Button>
      </div>
    </Card>
  );
}
