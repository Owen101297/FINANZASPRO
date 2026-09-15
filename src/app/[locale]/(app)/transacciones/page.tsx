"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Loader2, Plus, Receipt } from "lucide-react";
import { clsx } from "clsx";
import { fetcher } from "@/lib/client-api";
import { currentMonth, monthLabel, shiftMonth, formatDayMonth, formatCurrency } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import {
  TransactionRow,
  type TransactionItemData,
} from "@/components/transaction-row";
import { MovementModal, type MovementModalState } from "@/components/movement-modal";

type TxDto = TransactionItemData & {
  accountId: string | null;
  categoryId: string | null;
};

type TransactionsResponse = {
  transactions: TxDto[];
  nextCursor: string | null;
};

const PAGE_SIZE = 20;

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TransaccionesPage />
    </Suspense>
  );
}

function TransaccionesPage() {
  const t = useTranslations("transacciones");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(currentMonth());
  const [modalState, setModalState] = useState<MovementModalState>({ open: false });

  const [allTx, setAllTx] = useState<TxDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Abrir modal por query param (?new=gasto|ingreso|transferencia)
  useEffect(() => {
    const newParam = searchParams.get("new");
    if (newParam === "gasto" || newParam === "ingreso" || newParam === "transferencia") {
      setModalState({ open: true, mode: newParam });
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  // Reset pagination when month changes
  useEffect(() => {
    setAllTx([]);
    setCursor(null);
    setHasMore(true);
  }, [month]);

  const { data, isLoading, error } = useSWR<TransactionsResponse>(
    `/api/transactions?limit=${PAGE_SIZE}&month=${month}`,
    fetcher
  );

  // Merge first page data
  useEffect(() => {
    if (data) {
      setAllTx(prev => {
        if (prev.length > 0) return prev;
        return data.transactions;
      });
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    }
  }, [data]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetcher<TransactionsResponse>(
        `/api/transactions?limit=${PAGE_SIZE}&month=${month}&cursor=${cursor}`
      );
      setAllTx(prev => [...prev, ...res.transactions]);
      setCursor(res.nextCursor);
      setHasMore(res.nextCursor !== null);
    } catch {
      // Silenciar error; el usuario puede reintentar
    } finally {
      setLoadingMore(false);
    }
  }

  const grouped = useMemo(() => {
    const list = allTx.slice();
    const groups = new Map<string, TxDto[]>();
    for (const tx of list) {
      const key = tx.date.slice(0, 10);
      const arr = groups.get(key);
      if (arr) arr.push(tx);
      else groups.set(key, [tx]);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allTx]);

  const monthTotal = useMemo(() => {
    return round2(
      allTx
        .filter((t) => t.date.startsWith(month))
        .reduce((acc, t) => acc + (t.type === "EXPENSE" ? -t.amount : t.amount), 0)
    );
  }, [allTx, month]);

  function openEdit(tx: TransactionItemData) {
    setModalState({
      open: true,
      mode: tx.type === "INCOME" ? "ingreso" : "gasto",
      editTxId: tx.id,
      prefill: {
        amount: String(tx.amount),
        categoryId: tx.category?.id ?? "",
        accountId: tx.account?.id ?? "",
        note: tx.note ?? "",
        date: tx.date.slice(0, 10),
      },
    });
  }

  function closeModal() {
    setModalState({ open: false });
    // Refrescar: reset pagination
    setAllTx([]);
    setCursor(null);
    setHasMore(true);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t("title")}
        subtitle={`${monthLabel(month)} · ${t("subtitle", { amount: formatCurrency(monthTotal) })}`}
        action={
          <button
            onClick={() => setModalState({ open: true, mode: "gasto" })}
            aria-label={t("newMovement")}
            className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      {/* Selector de mes */}
      <div className="mb-5 flex items-center justify-between rounded-card border border-border bg-card px-3 py-2.5">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label={t("prevMonth")}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-bold capitalize">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          aria-label={t("nextMonth")}
          disabled={month >= currentMonth()}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
            <EmptyState
              title={t("loadError")}
              hint={t("loadErrorHint")}
            />
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
            <EmptyState
              icon={<Receipt className="size-5" />}
              title={t("empty")}
              hint={t("emptyHint")}
            />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, txs]) => {
            const inMonth = day.startsWith(month);
            const dayTotal = round2(
              txs.reduce((acc, t) => acc + (t.type === "EXPENSE" ? -t.amount : t.amount), 0)
            );
            return (
              <section key={day} aria-label={day} className={clsx(!inMonth && "opacity-50")}>
                <div className="mb-1 flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {formatDayMonth(day)}
                  </h3>
                  <span
                    className={clsx(
                      "font-mono text-xs font-semibold tabular-nums",
                      dayTotal >= 0 ? "text-positive" : "text-muted-foreground"
                    )}
                  >
                    {formatCurrency(dayTotal)}
                  </span>
                </div>
                <Card className="divide-y divide-border p-1.5">
                  {txs.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} onEdit={openEdit} />
                  ))}
                </Card>
              </section>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("loadMore")
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <MovementModal state={{ ...modalState }} onClose={closeModal} />
    </div>
  );
}
