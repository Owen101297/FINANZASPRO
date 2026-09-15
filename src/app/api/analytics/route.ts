import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, privateCache } from "@/lib/server";
import { badRequest } from "@/lib/errors";
import { monthParamSchema } from "@/lib/validations";
import { num } from "@/lib/mappers";
import { buildInsights } from "@/lib/insights";

/**
 * Análisis mensual: totales, distribución por categoría, serie diaria e
 * insights generados con reglas locales (sin servicios externos).
 */
export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);

  const monthParam = req.nextUrl.searchParams.get("month");
  let start: Date;
  let end: Date;

  if (monthParam) {
    const parsed = monthParamSchema.safeParse(monthParam);
    if (!parsed.success) throw badRequest("Mes inválido (usa el formato YYYY-MM)");
    const [y, m] = parsed.data.split("-").map(Number);
    start = new Date(y!, m! - 1, 1);
    end = new Date(y!, m!, 1);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

  const [transactions, salaryAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: { walletId: wallet.id, date: { gte: start, lt: end } },
      select: {
        type: true,
        amount: true,
        date: true,
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.wallet.findUnique({ where: { id: wallet.id }, select: { salary: true } }),
  ]);

  const salary = num(salaryAgg?.salary ?? 0);

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategoryMap = new Map<string, { name: string; color: string | null; total: number }>();
  const dailyMap = new Map<number, number>();

  for (const t of transactions) {
    const amount = num(t.amount);
    if (t.type === "INCOME") {
      totalIncome += amount;
      continue;
    }
    totalExpense += amount;
    if (t.category) {
      const key = t.category.id;
      const prev = byCategoryMap.get(key);
      if (prev) prev.total += amount;
      else byCategoryMap.set(key, { name: t.category.name, color: t.category.color, total: amount });
    } else {
      const key = "__uncategorized__";
      const prev = byCategoryMap.get(key);
      if (prev) prev.total += amount;
      else byCategoryMap.set(key, { name: "Sin categoría", color: null, total: amount });
    }
    const day = t.date.getDate();
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + amount);
  }

  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const dailySeries = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    total: Math.round((dailyMap.get(i + 1) ?? 0) * 100) / 100,
  }));

  const byCategory = Array.from(byCategoryMap.values())
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      ...c,
      pct: totalExpense > 0 ? Math.round((c.total / totalExpense) * 1000) / 10 : 0,
    }));

  const subscriptionsActive = await prisma.subscription.aggregate({
    where: { walletId: wallet.id, active: true },
    _sum: { amount: true },
  });

  const analysis = {
    month: label,
    totals: {
      income: Math.round(totalIncome * 100) / 100,
      expense: Math.round(totalExpense * 100) / 100,
      net: Math.round((totalIncome - totalExpense) * 100) / 100,
      salary,
    },
    byCategory,
    dailySeries,
    subscriptionsMonthly: num(subscriptionsActive._sum.amount),
    transactionCount: transactions.length,
  };

  return privateCache(NextResponse.json({
    analysis,
    insights: buildInsights(analysis),
  }));
});
