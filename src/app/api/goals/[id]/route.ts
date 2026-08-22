import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { paramId } from "@/lib/guards";
import { notFound } from "@/lib/errors";
import { goalUpdateSchema } from "@/lib/validations";
import { goalDto, num } from "@/lib/mappers";

export const PATCH = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);
  const body = goalUpdateSchema.parse(await readJson(req));

  const existing = await prisma.goal.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Meta no encontrada");

  const saved = body.savedAmount !== undefined ? body.savedAmount : num(existing.savedAmount);
  const target =
    body.targetAmount !== undefined ? body.targetAmount : num(existing.targetAmount);
  const completedAt = saved >= target && target > 0 ? (existing.completedAt ?? new Date()) : null;

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount }),
      ...(body.savedAmount !== undefined && { savedAmount: body.savedAmount }),
      ...(body.deadline !== undefined && { deadline: body.deadline ?? null }),
      ...(body.note !== undefined && { note: body.note ?? null }),
      completedAt,
    },
  });

  await audit({ actorId: user.id, action: "GOAL_UPDATED", targetId: id });
  return NextResponse.json({ goal: goalDto(updated) });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);

  const existing = await prisma.goal.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Meta no encontrada");
  await prisma.goal.delete({ where: { id } });

  await audit({ actorId: user.id, action: "GOAL_DELETED", targetId: id });
  return NextResponse.json({ ok: true });
});
