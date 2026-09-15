import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { notFound, badRequest } from "@/lib/errors";
import { transactionCreateSchema, monthParamSchema } from "@/lib/validations";
import { transactionDto, num } from "@/lib/mappers";
import { getCycleRange } from "@/lib/cycle";
import { evaluateBudgetCross } from "@/lib/budget-alert";

/**
 * Lista transacciones del ciclo actual (o de un mes dado con ?month=YYYY-MM).
 * Incluye refs de cuenta y categoría para pintar la lista.
 * Soporta paginación con cursor: ?cursor=<id>&limit=20
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
    ({ start, end } = getCycleRange(wallet.cycleStartDay));
  }

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const take = Math.min(Math.max(1, Math.floor(limitParam) || 20), 50);
  const cursor = req.nextUrl.searchParams.get("cursor");

  const transactions = await prisma.transaction.findMany({
    where: { walletId: wallet.id, date: { gte: start, lt: end } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      account: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  const hasMore = transactions.length > take;
  const items = hasMore ? transactions.slice(0, take) : transactions;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return NextResponse.json({
    transactions: items.map(transactionDto),
    nextCursor,
  });
});

export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = transactionCreateSchema.parse(await readJson(req));

  // Validar que cuenta y categoría pertenezcan al wallet
  if (body.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: body.accountId, walletId: wallet.id },
    });
    if (!account) throw notFound("Cuenta no encontrada");
  }
  if (body.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, walletId: wallet.id },
    });
    if (!category) throw notFound("Categoría no encontrada");
  }

  const date = body.date ?? new Date();

  // Transacción atómica: crear movimiento + ajustar saldo de la cuenta +
  // evaluar alerta de presupuesto (reemplaza la Cloud Function antigua).
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: body.type,
        amount: body.amount,
        note: body.note ?? null,
        accountId: body.accountId ?? null,
        categoryId: body.categoryId ?? null,
        date,
      },
      include: {
        account: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    if (created.accountId) {
      const delta = created.type === "INCOME" ? num(created.amount) : -num(created.amount);
      await tx.account.update({
        where: { id: created.accountId },
        data: { balance: { increment: delta } },
      });
    }

    // Alerta al superar el 90% del salario en el ciclo. Solo un gasto del ciclo
    // puede cruzar el umbral, así que se omite el cálculo para ingresos.
    let budgetAlert = false;
    const salary = num(wallet.salary);
    if (body.type === "EXPENSE" && salary > 0) {
      budgetAlert = await evaluateBudgetCross(
        tx,
        { walletId: wallet.id, salary, cycleStartDay: wallet.cycleStartDay, actorId: user.id },
        {
          excludeId: created.id,
          before: null,
          after: { type: created.type, amount: num(created.amount), date },
        }
      );
    }

    return { created, budgetAlert };
  });

  await audit({ actorId: user.id, action: "TRANSACTION_CREATED", targetId: result.created.id });

  return NextResponse.json(
    { transaction: transactionDto(result.created), budgetAlert: result.budgetAlert },
    { status: 201 }
  );
});
