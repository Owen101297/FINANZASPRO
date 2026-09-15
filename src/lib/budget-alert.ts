import type { Prisma } from "@prisma/client";
import { getCycleRange } from "@/lib/cycle";
import { num } from "@/lib/mappers";

export interface BudgetContribution {
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: Date;
}

export interface BudgetContext {
  walletId: string;
  salary: number;
  cycleStartDay: number;
  actorId: string;
}

/**
 * Evalúa si una mutación de transacción hace que los gastos del ciclo crucen el
 * umbral del 90% del salario (pasa de <=90% a >90%) y, si lo cruza, registra el
 * evento BUDGET_ALERT en audit_logs dentro de la misma transacción atómica.
 *
 * `before` describe la transacción tal como existía antes de la mutación
 * (null = no existía aún, p.ej. una creación); `after` describe su nueva
 * versión. Con este mismo helper se cubren crear, editar y borrar: en el borrado
 * el evento es imposible porque el total de gastos solo baja.
 */
export async function evaluateBudgetCross(
  tx: Prisma.TransactionClient,
  ctx: BudgetContext,
  opts: { excludeId: string; before: BudgetContribution | null; after: BudgetContribution }
): Promise<boolean> {
  const salary = num(ctx.salary);
  if (salary <= 0) return false;

  async function totalInCycle(contrib: BudgetContribution | null): Promise<number> {
    const range = getCycleRange(ctx.cycleStartDay, contrib ? contrib.date : opts.after.date);
    const agg = await tx.transaction.aggregate({
      where: {
        walletId: ctx.walletId,
        type: "EXPENSE",
        id: { not: opts.excludeId },
        date: { gte: range.start, lt: range.end },
      },
      _sum: { amount: true },
    });
    let total = Number(agg._sum.amount ?? 0);
    if (contrib && contrib.type === "EXPENSE") total += num(contrib.amount);
    return total;
  }

  const beforeTotal = await totalInCycle(opts.before);
  const afterTotal = await totalInCycle(opts.after);

  if (beforeTotal <= salary * 0.9 && afterTotal > salary * 0.9) {
    await tx.auditLog.create({
      data: {
        actorId: ctx.actorId,
        action: "BUDGET_ALERT",
        targetId: ctx.actorId,
        meta: { totalExpenses: afterTotal, salary, thresholdPct: 90 },
      },
    });
    return true;
  }
  return false;
}