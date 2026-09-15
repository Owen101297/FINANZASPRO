import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { badRequest, notFound } from "@/lib/errors";
import { num } from "@/lib/mappers";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "Selecciona al menos una transacción").max(100, "Máximo 100 por lote"),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  data: z.object({
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
  }),
});

/**
 * DELETE /api/transactions/bulk
 * Elimina múltiples transacciones y ajusta saldos de cuentas.
 */
export const DELETE = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const { ids } = bulkDeleteSchema.parse(await readJson(req));

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: ids }, walletId: wallet.id },
  });

  if (transactions.length === 0) throw badRequest("No se encontraron transacciones");

  await prisma.$transaction(async (tx) => {
    for (const t of transactions) {
      if (t.accountId) {
        const delta = t.type === "INCOME" ? -num(t.amount) : num(t.amount);
        await tx.account.update({
          where: { id: t.accountId },
          data: { balance: { increment: delta } },
        });
      }
      await tx.transaction.delete({ where: { id: t.id } });
    }
  });

  await audit({ actorId: user.id, action: "TRANSACTION_BULK_DELETE", targetId: ids.join(",") });

  return NextResponse.json({ deleted: transactions.length });
});

/**
 * PATCH /api/transactions/bulk
 * Actualiza categoría o cuenta de múltiples transacciones.
 */
export const PATCH = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const { ids, data } = bulkUpdateSchema.parse(await readJson(req));

  if (Object.keys(data).length === 0) throw badRequest("Proporciona al menos un campo a actualizar");

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: ids }, walletId: wallet.id },
  });

  if (transactions.length === 0) throw badRequest("No se encontraron transacciones");

  if (data.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, walletId: wallet.id },
    });
    if (!account) throw notFound("Cuenta no encontrada");
  }
  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, walletId: wallet.id },
    });
    if (!category) throw notFound("Categoría no encontrada");
  }

  await prisma.transaction.updateMany({
    where: { id: { in: ids } },
    data,
  });

  await audit({ actorId: user.id, action: "TRANSACTION_BULK_UPDATE", targetId: ids.join(",") });

  return NextResponse.json({ updated: transactions.length });
});
