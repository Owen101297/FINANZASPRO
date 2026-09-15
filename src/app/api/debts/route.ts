import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit, privateCache } from "@/lib/server";
import { debtCreateSchema } from "@/lib/validations";
import { debtDto } from "@/lib/mappers";

export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);
  const debts = await prisma.debt.findMany({
    where: { walletId: wallet.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return privateCache(NextResponse.json({ debts: debts.map(debtDto) }));
});

export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = debtCreateSchema.parse(await readJson(req));

  const debt = await prisma.debt.create({
    data: {
      walletId: wallet.id,
      name: body.name,
      totalAmount: body.totalAmount,
      paidAmount: body.paidAmount,
      dueDate: body.dueDate ?? null,
      note: body.note ?? null,
    },
  });

  await audit({ actorId: user.id, action: "DEBT_CREATED", targetId: debt.id });
  return NextResponse.json({ debt: debtDto(debt) }, { status: 201 });
});
