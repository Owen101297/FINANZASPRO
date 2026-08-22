import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { notFound, badRequest } from "@/lib/errors";
import { transferCreateSchema } from "@/lib/validations";
import { transferDto } from "@/lib/mappers";

/** Lista transferencias recientes. */
export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);
  const transfers = await prisma.transfer.findMany({
    where: { walletId: wallet.id },
    orderBy: { date: "desc" },
    take: 50,
    include: {
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
    },
  });
  return NextResponse.json({ transfers: transfers.map(transferDto) });
});

/**
 * Crea una transferencia entre cuentas del wallet.
 * Atómica: descuenta en origen, acredita en destino y registra el movimiento.
 */
export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = transferCreateSchema.parse(await readJson(req));

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: body.fromAccountId, walletId: wallet.id } }),
    prisma.account.findFirst({ where: { id: body.toAccountId, walletId: wallet.id } }),
  ]);
  if (!fromAccount) throw notFound("Cuenta de origen no encontrada");
  if (!toAccount) throw notFound("Cuenta de destino no encontrada");

  if (Number(fromAccount.balance) < body.amount) {
    throw badRequest("Saldo insuficiente en la cuenta de origen");
  }

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.transfer.create({
      data: {
        walletId: wallet.id,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: body.amount,
        note: body.note ?? null,
      },
    });

    await tx.account.update({
      where: { id: fromAccount.id },
      data: { balance: { decrement: body.amount } },
    });
    await tx.account.update({
      where: { id: toAccount.id },
      data: { balance: { increment: body.amount } },
    });

    return created;
  });

  await audit({
    actorId: user.id,
    action: "TRANSFER_CREATED",
    targetId: transfer.id,
    meta: { amount: body.amount, from: fromAccount.name, to: toAccount.name },
  });

  return NextResponse.json(
    { transfer: transferDto({ ...transfer, fromAccount, toAccount }) },
    { status: 201 }
  );
});
