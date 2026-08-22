import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { paramId } from "@/lib/guards";
import { notFound } from "@/lib/errors";
import { subscriptionUpdateSchema } from "@/lib/validations";
import { subscriptionDto } from "@/lib/mappers";

export const PATCH = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);
  const body = subscriptionUpdateSchema.parse(await readJson(req));

  if (body.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: body.accountId, walletId: wallet.id },
    });
    if (!account) throw notFound("Cuenta no encontrada");
  }

  const existing = await prisma.subscription.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Suscripción no encontrada");

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.billingDay !== undefined && { billingDay: body.billingDay }),
      ...(body.accountId !== undefined && { accountId: body.accountId ?? null }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.note !== undefined && { note: body.note ?? null }),
    },
    include: { account: { select: { id: true, name: true } } },
  });

  await audit({ actorId: user.id, action: "SUBSCRIPTION_UPDATED", targetId: id });
  return NextResponse.json({ subscription: subscriptionDto(updated) });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);

  const existing = await prisma.subscription.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Suscripción no encontrada");
  await prisma.subscription.delete({ where: { id } });

  await audit({ actorId: user.id, action: "SUBSCRIPTION_DELETED", targetId: id });
  return NextResponse.json({ ok: true });
});
