import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { paramId } from "@/lib/guards";
import { notFound } from "@/lib/errors";
import { debtUpdateSchema } from "@/lib/validations";
import { debtDto } from "@/lib/mappers";

export const PATCH = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);
  const body = debtUpdateSchema.parse(await readJson(req));

  const existing = await prisma.debt.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Deuda no encontrada");

  // Si los pagos alcanzan el total, marca como pagada automáticamente
  const paid = body.paidAmount !== undefined ? body.paidAmount : Number(existing.paidAmount);
  const total =
    body.totalAmount !== undefined ? body.totalAmount : Number(existing.totalAmount);
  const status = body.status ?? (paid >= total && total > 0 ? "PAID" : "ACTIVE");

  const updated = await prisma.debt.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.totalAmount !== undefined && { totalAmount: body.totalAmount }),
      ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ?? null }),
      ...(body.note !== undefined && { note: body.note ?? null }),
      status,
    },
  });

  await audit({ actorId: user.id, action: "DEBT_UPDATED", targetId: id });
  return NextResponse.json({ debt: debtDto(updated) });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);

  const existing = await prisma.debt.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Deuda no encontrada");
  await prisma.debt.delete({ where: { id } });

  await audit({ actorId: user.id, action: "DEBT_DELETED", targetId: id });
  return NextResponse.json({ ok: true });
});
