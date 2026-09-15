"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/client-api";

export interface WalletAccount {
  id: string;
  name: string;
  balance: number;
  color: string | null;
  archived: boolean;
}

export interface WalletData {
  wallet: {
    salary: number;
    cycleStartDay: number;
    cycle: { start: string; end: string; daysElapsed: number; daysTotal: number };
  };
  summary: {
    totalBalance: number;
    cycleExpenses: number;
    cycleRemaining: number;
    usedPct: number;
    budgetAlert: boolean;
    accountCount: number;
  };
  accounts: WalletAccount[];
  categories: Array<{
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    color: string | null;
    icon: string | null;
  }>;
  user: { id: string; name: string | null; email: string; role: "USER" | "ADMIN" };
}

export function useWallet() {
  const { data, error, isLoading, mutate } = useSWR<WalletData>("/api/wallet", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
    refreshInterval: 30_000,
  });
  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}
