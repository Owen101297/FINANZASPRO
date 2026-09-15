import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit, privateCache } from "@/lib/server";
import { goalCreateSchema } from "@/lib/validations";
import { goalDto, num } from "@/lib/mappers";

export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);
  const goals = await prisma.goal.findMany({
    where: { walletId: wallet.id },
    orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
  });
  return privateCache(NextResponse.json({ goals: goals.map(goalDto) }));
});

export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = goalCreateSchema.parse(await readJson(req));

  const goal = await prisma.goal.create({
    data: {
      walletId: wallet.id,
      name: body.name,
      targetAmount: body.targetAmount,
      savedAmount: body.savedAmount,
      deadline: body.deadline ?? null,
      note: body.note ?? null,
      completedAt:
        num(body.savedAmount) >= num(body.targetAmount) ? new Date() : null,
    },
  });

  await audit({ actorId: user.id, action: "GOAL_CREATED", targetId: goal.id });
  return NextResponse.json({ goal: goalDto(goal) }, { status: 201 });
});
