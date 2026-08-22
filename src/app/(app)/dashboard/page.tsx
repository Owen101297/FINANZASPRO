"use client";

import Link from "next/link";
import {
  Plus,
  ArrowLeftRight,
  TrendingUp,
  Wallet as WalletIcon,
  ChevronRight,
  Loader2,
} from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/client-api";
import { useWallet } from "@/hooks/use-wallet";
import { formatCurrency } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui/primitives";
import { TransactionRow, type TransactionItemData } from "@/components/transaction-row";
import {
  BalanceCard,
  BudgetAlertBanner,
  DashboardGreeting,
} from "@/components/dashboard-widgets";

export default function DashboardPage() {
  const { data, isLoading } = useWallet();

  return (
    <div className="animate-fade-in">
      <DashboardGreeting />
      <BudgetAlertBanner />
      <BalanceCard />

      {/* Acciones rápidas */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <QuickAction
          href="/transacciones?new=gasto"
          icon={<Plus className="size-5" />}
          label="Gasto"
        />
        <QuickAction
          href="/transacciones?new=ingreso"
          icon={<TrendingUp className="size-5" />}
          label="Ingreso"
        />
        <QuickAction
          href="/transacciones?new=transferencia"
          icon={<ArrowLeftRight className="size-5" />}
          label="Transferir"
        />
      </div>

      {/* Cuentas */}
      <section className="mt-7" aria-label="Cuentas">
        <SectionHeader title="Cuentas" href="/cuentas" count={data?.summary.accountCount} />
        <Card className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.accounts.filter((a) => !a.archived).length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {data.accounts
                .filter((a) => !a.archived)
                .map((account) => (
                  <Link
                    key={account.id}
                    href="/transacciones"
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-background/50 px-3.5 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: account.color ?? "#10b981" }}
                    />
                    <span className="text-xs font-semibold">{account.name}</span>
                    <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground group-hover:text-foreground">
                      {formatCurrency(account.balance)}
                    </span>
                  </Link>
                ))}
            </div>
          ) : (
            <EmptyState
              icon={<WalletIcon className="size-5" />}
              title="Sin cuentas todavía"
              hint="Crea tu primera cuenta para empezar a registrar movimientos."
            />
          )}
        </Card>
      </section>

      {/* Movimientos recientes */}
      <RecentTransactions />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-card border border-border bg-card py-4 text-xs font-semibold transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.97]"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function SectionHeader({ title, href, count }: { title: string; href: string; count?: number }) {
  return (
    <div className="mb-3 mt-1 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title}
        {count !== undefined && ` · ${count}`}
      </h2>
      <Link
        href={href}
        className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
      >
        Ver todo <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}

function RecentTransactions() {
  const { data, isLoading } = useSWR<{ transactions: TransactionItemData[] }>(
    "/api/transactions?limit=8",
    fetcher
  );

  return (
    <section className="mt-7" aria-label="Movimientos recientes">
      <SectionHeader title="Movimientos recientes" href="/transacciones" />
      <Card className="divide-y divide-border p-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.transactions.length > 0 ? (
          data.transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        ) : (
          <EmptyState
            title="Aún no hay movimientos"
            hint="Registra tu primer gasto o ingreso del ciclo con los botones de arriba."
          />
        )}
      </Card>
    </section>
  );
}
