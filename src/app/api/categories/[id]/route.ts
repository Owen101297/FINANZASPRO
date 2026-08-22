import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { paramId } from "@/lib/guards";
import { notFound } from "@/lib/errors";
import { categoryUpdateSchema } from "@/lib/validations";
import { categoryDto } from "@/lib/mappers";

export const PATCH = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);
  const body = categoryUpdateSchema.parse(await readJson(req));

  const existing = await prisma.category.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Categoría no encontrada");

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color ?? null }),
      ...(body.icon !== undefined && { icon: body.icon ?? null }),
    },
  });

  await audit({ actorId: user.id, action: "CATEGORY_UPDATED", targetId: id });
  return NextResponse.json({ category: categoryDto(updated) });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  const { user, wallet } = await requireUser(req);
  const id = await paramId(ctx);

  const existing = await prisma.category.findFirst({ where: { id, walletId: wallet.id } });
  if (!existing) throw notFound("Categoría no encontrada");
  await prisma.category.delete({ where: { id } });

  await audit({ actorId: user.id, action: "CATEGORY_DELETED", targetId: id });
  return NextResponse.json({ ok: true });
});
