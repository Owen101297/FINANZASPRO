import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { badRequest } from "@/lib/errors";
import { walletPatchSchema } from "@/lib/validations";
import { getCycleRange, getCycleProgress } from "@/lib/cycle";
import { num, accountDto, categoryDto } from "@/lib/mappers";

/** Resumen del wallet para el dashboard: saldo, gastos del ciclo, alertas. */
export const GET = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);

  const cycleRange = getCycleRange(wallet.cycleStartDay);
  const [accounts, categories, cycleAgg] = await Promise.all([
    prisma.account.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { walletId: wallet.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        type: "EXPENSE",
        date: { gte: cycleRange.start, lt: cycleRange.end },
      },
      _sum: { amount: true },
    }),
  ]);

  const salary = num(wallet.salary);
  const cycleExpenses = num(cycleAgg._sum.amount);
  const totalBalance = accounts.reduce((acc, a) => acc + num(a.balance), 0);

  return NextResponse.json({
    wallet: {
      salary,
      cycleStartDay: wallet.cycleStartDay,
      cycle: {
        start: cycleRange.start.toISOString(),
        end: cycleRange.end.toISOString(),
        ...getCycleProgress(wallet.cycleStartDay),
      },
    },
    summary: {
      totalBalance,
      cycleExpenses,
      cycleRemaining: salary - cycleExpenses,
      usedPct: salary > 0 ? Math.min(100, (cycleExpenses / salary) * 100) : 0,
      budgetAlert: salary > 0 && cycleExpenses > salary * 0.9,
      accountCount: accounts.filter((a) => !a.archived).length,
    },
    accounts: accounts.map(accountDto),
    categories: categories.map(categoryDto),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

/** Actualiza salario y día de inicio del ciclo. */
export const PATCH = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = walletPatchSchema.parse(await readJson(req));

  const data: { salary?: number; cycleStartDay?: number } = {};
  if (body.salary !== undefined) data.salary = body.salary;
  if (body.cycleStartDay !== undefined) data.cycleStartDay = body.cycleStartDay;
  if (Object.keys(data).length === 0) throw badRequest("Envía al menos un campo para actualizar");

  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data,
  });

  await audit({
    actorId: user.id,
    action: "WALLET_UPDATED",
    targetId: wallet.id,
    meta: { salary: body.salary, cycleStartDay: body.cycleStartDay },
  });

  return NextResponse.json({
    wallet: { salary: num(updated.salary), cycleStartDay: updated.cycleStartDay },
  });
});
