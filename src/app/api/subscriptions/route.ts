import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { notFound } from "@/lib/errors";
import { subscriptionCreateSchema } from "@/lib/validations";
import { subscriptionDto } from "@/lib/mappers";

export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);
  const subscriptions = await prisma.subscription.findMany({
    where: { walletId: wallet.id },
    orderBy: [{ active: "desc" }, { billingDay: "asc" }],
    include: { account: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ subscriptions: subscriptions.map(subscriptionDto) });
});

export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = subscriptionCreateSchema.parse(await readJson(req));

  if (body.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: body.accountId, walletId: wallet.id },
    });
    if (!account) throw notFound("Cuenta no encontrada");
  }

  const subscription = await prisma.subscription.create({
    data: {
      walletId: wallet.id,
      name: body.name,
      amount: body.amount,
      billingDay: body.billingDay,
      accountId: body.accountId ?? null,
      active: body.active,
      note: body.note ?? null,
    },
    include: { account: { select: { id: true, name: true } } },
  });

  await audit({ actorId: user.id, action: "SUBSCRIPTION_CREATED", targetId: subscription.id });
  return NextResponse.json({ subscription: subscriptionDto(subscription) }, { status: 201 });
});
