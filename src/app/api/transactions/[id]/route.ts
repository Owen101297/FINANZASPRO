import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { paramId } from "@/lib/guards";
import { notFound } from "@/lib/errors";
import { transactionUpdateSchema } from "@/lib/validations";
import { transactionDto, num } from "@/lib/mappers";

/**
 * Actualiza una transacción revirtiendo el impacto anterior en el saldo de la
 * cuenta y aplicando el nuevo (todo dentro de una transacción atómica).
 */
export const PATCH = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);
  const body = transactionUpdateSchema.parse(await readJson(req));

  const existing = await prisma.transaction.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Transacción no encontrada");

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

  const updated = await prisma.$transaction(async (tx) => {
    const previous = await tx.transaction.findUniqueOrThrow({ where: { id } });

    // Revertir saldo anterior
    if (previous.accountId) {
      const delta =
        previous.type === "INCOME" ? -num(previous.amount) : num(previous.amount);
      await tx.account.update({
        where: { id: previous.accountId },
        data: { balance: { increment: delta } },
      });
    }

    const next = await tx.transaction.update({
      where: { id },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.note !== undefined && { note: body.note ?? null }),
        ...(body.accountId !== undefined && { accountId: body.accountId ?? null }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId ?? null }),
        ...(body.date !== undefined && { date: body.date }),
      },
      include: {
        account: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    // Aplicar nuevo saldo
    if (next.accountId) {
      const delta = next.type === "INCOME" ? num(next.amount) : -num(next.amount);
      await tx.account.update({
        where: { id: next.accountId },
        data: { balance: { increment: delta } },
      });
    }

    return next;
  });

  await audit({ actorId: user.id, action: "TRANSACTION_UPDATED", targetId: id });
  return NextResponse.json({ transaction: transactionDto(updated) });
});

/** Elimina una transacción y revierte su impacto en el saldo. */
export const DELETE = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);

  const existing = await prisma.transaction.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Transacción no encontrada");

  await prisma.$transaction(async (tx) => {
    const previous = await tx.transaction.findUniqueOrThrow({ where: { id } });
    if (previous.accountId) {
      const delta =
        previous.type === "INCOME" ? -num(previous.amount) : num(previous.amount);
      await tx.account.update({
        where: { id: previous.accountId },
        data: { balance: { increment: delta } },
      });
    }
    await tx.transaction.delete({ where: { id } });
  });

  await audit({ actorId: user.id, action: "TRANSACTION_DELETED", targetId: id });
  return NextResponse.json({ ok: true });
});
