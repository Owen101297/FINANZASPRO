"use client";

import { clsx } from "clsx";
import { formatCurrency, formatDayMonth } from "@/lib/format";
import { useTranslations } from "next-intl";

export interface TransactionItemData {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  note: string | null;
  date: string;
  account: { id: string; name: string; color: string | null } | null;
  category: { id: string; name: string; color: string | null } | null;
}

const CATEGORY_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#a78bfa",
  "#06b6d4",
  "#10b981",
];

function colorFor(name: string | null, explicit?: string | null): string {
  if (explicit) return explicit;
  if (!name) return "#6b7280";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length] ?? "#6b7280";
}

export function TransactionRow({ tx, onEdit }: { tx: TransactionItemData; onEdit?: (tx: TransactionItemData) => void }) {
  const t = useTranslations("common");
  const isIncome = tx.type === "INCOME";
  const label = tx.category?.name ?? t("noCategory");
  const color = colorFor(label, tx.category?.color);

  return (
    <button
      onClick={() => onEdit?.(tx)}
      disabled={!onEdit}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
        onEdit && "hover:bg-muted"
      )}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold uppercase"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {label.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {formatDayMonth(tx.date)}
          {tx.account ? ` · ${tx.account.name}` : ""}
          {tx.note ? ` · ${tx.note}` : ""}
        </span>
      </span>
      <span
        className={clsx(
          "shrink-0 font-mono text-sm font-semibold tabular-nums",
          isIncome ? "text-positive" : "text-foreground"
        )}
      >
        {isIncome ? "+" : "−"}
        {formatCurrency(tx.amount)}
      </span>
    </button>
  );
}
