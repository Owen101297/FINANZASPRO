import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { accountCreateSchema } from "@/lib/validations";
import { accountDto } from "@/lib/mappers";

export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);
  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ accounts: accounts.map(accountDto) });
});

export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = accountCreateSchema.parse(await readJson(req));

  const account = await prisma.account.create({
    data: {
      walletId: wallet.id,
      name: body.name,
      balance: body.balance,
      color: body.color ?? null,
    },
  });

  await audit({
    actorId: user.id,
    action: "ACCOUNT_CREATED",
    targetId: account.id,
    meta: { name: account.name },
  });

  return NextResponse.json({ account: accountDto(account) }, { status: 201 });
});
