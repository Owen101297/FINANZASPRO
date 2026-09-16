import type { Prisma } from "@prisma/client";

/** Convierte un Decimal de Prisma a number para serializar en JSON. */
export function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export type AccountRecord = {
  id: string;
  name: string;
  balance: Prisma.Decimal | number;
  color: string | null;
  archived: boolean;
  resetAt?: Date | null;
  createdAt: Date;
};

export type CategoryRecord = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string | null;
  icon: string | null;
};

export type TransactionRecord = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: Prisma.Decimal | number;
  note: string | null;
  date: Date;
  accountId: string | null;
  categoryId: string | null;
  account?: { id: string; name: string; color: string | null } | null;
  category?: { id: string; name: string; color: string | null } | null;
};

export type TransferRecord = {
  id: string;
  amount: Prisma.Decimal | number;
  note: string | null;
  date: Date;
  fromAccountId: string;
  toAccountId: string;
  fromAccount?: { name: string } | null;
  toAccount?: { name: string } | null;
};

export type DebtRecord = {
  id: string;
  name: string;
  totalAmount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
  status: "ACTIVE" | "PAID";
  dueDate: Date | null;
  note: string | null;
};

export type SubscriptionRecord = {
  id: string;
  name: string;
  amount: Prisma.Decimal | number;
  billingDay: number;
  active: boolean;
  note: string | null;
  accountId: string | null;
  account?: { id: string; name: string } | null;
};

export type GoalRecord = {
  id: string;
  name: string;
  targetAmount: Prisma.Decimal | number;
  savedAmount: Prisma.Decimal | number;
  deadline: Date | null;
  completedAt: Date | null;
  note: string | null;
};

export const accountDto = (a: AccountRecord) => ({
  id: a.id,
  name: a.name,
  balance: num(a.balance),
  color: a.color,
  archived: a.archived,
  resetAt: a.resetAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
});

export const categoryDto = (c: CategoryRecord) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  color: c.color,
  icon: c.icon,
});

export const transactionDto = (t: TransactionRecord) => ({
  id: t.id,
  type: t.type,
  amount: num(t.amount),
  note: t.note,
  date: t.date.toISOString(),
  accountId: t.accountId,
  categoryId: t.categoryId,
  account: t.account ? { id: t.account.id, name: t.account.name, color: t.account.color } : null,
  category: t.category
    ? { id: t.category.id, name: t.category.name, color: t.category.color }
    : null,
});

export const transferDto = (t: TransferRecord) => ({
  id: t.id,
  amount: num(t.amount),
  note: t.note,
  date: t.date.toISOString(),
  fromAccountId: t.fromAccountId,
  toAccountId: t.toAccountId,
  fromAccountName: t.fromAccount?.name ?? null,
  toAccountName: t.toAccount?.name ?? null,
});

export const debtDto = (d: DebtRecord) => ({
  id: d.id,
  name: d.name,
  totalAmount: num(d.totalAmount),
  paidAmount: num(d.paidAmount),
  status: d.status,
  dueDate: d.dueDate?.toISOString() ?? null,
  note: d.note,
});

export const subscriptionDto = (s: SubscriptionRecord) => ({
  id: s.id,
  name: s.name,
  amount: num(s.amount),
  billingDay: s.billingDay,
  active: s.active,
  note: s.note,
  accountId: s.accountId,
  accountName: s.account?.name ?? null,
});

export const goalDto = (g: GoalRecord) => ({
  id: g.id,
  name: g.name,
  targetAmount: num(g.targetAmount),
  savedAmount: num(g.savedAmount),
  deadline: g.deadline?.toISOString() ?? null,
  completedAt: g.completedAt?.toISOString() ?? null,
  note: g.note,
});
