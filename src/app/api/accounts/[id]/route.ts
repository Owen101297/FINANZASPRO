import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { paramId } from "@/lib/guards";
import { ApiError, notFound } from "@/lib/errors";
import { accountUpdateSchema } from "@/lib/validations";
import { accountDto } from "@/lib/mappers";

export const PATCH = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);
  const body = accountUpdateSchema.parse(await readJson(req));

  const existing = await prisma.account.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Cuenta no encontrada");

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.balance !== undefined && { balance: body.balance }),
      ...(body.color !== undefined && { color: body.color ?? null }),
      ...(body.archived !== undefined && { archived: body.archived }),
    },
  });

  await audit({ actorId: user.id, action: "ACCOUNT_UPDATED", targetId: id });
  return NextResponse.json({ account: accountDto(updated) });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);

  const existing = await prisma.account.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Cuenta no encontrada");

  // Las transferencias restringen el borrado (onDelete: Restrict); las
  // transacciones y suscripciones quedan con cuenta nula.
  try {
    await prisma.account.delete({ where: { id } });
  } catch {
    throw new ApiError(
      409,
      "No se puede eliminar: la cuenta tiene transferencias asociadas. Archívala en su lugar."
    );
  }

  await audit({ actorId: user.id, action: "ACCOUNT_DELETED", targetId: id });
  return NextResponse.json({ ok: true });
});
