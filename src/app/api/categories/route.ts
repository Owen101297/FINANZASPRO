import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser, readJson, audit } from "@/lib/server";
import { conflict } from "@/lib/errors";
import { categoryCreateSchema } from "@/lib/validations";
import { categoryDto } from "@/lib/mappers";

export const GET = route(async (req: NextRequest) => {
  const { wallet } = await requireUser(req);
  const categories = await prisma.category.findMany({
    where: { walletId: wallet.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories: categories.map(categoryDto) });
});

export const POST = route(async (req: NextRequest) => {
  const { user, wallet } = await requireUser(req);
  const body = categoryCreateSchema.parse(await readJson(req));

  const duplicate = await prisma.category.findFirst({
    where: { walletId: wallet.id, name: body.name, type: body.type },
  });
  if (duplicate) throw conflict("Ya existe una categoría con ese nombre");

  const created = await prisma.category.create({
    data: {
      walletId: wallet.id,
      name: body.name,
      type: body.type,
      color: body.color ?? null,
      icon: body.icon ?? null,
    },
  });

  await audit({ actorId: user.id, action: "CATEGORY_CREATED", targetId: created.id });
  return NextResponse.json({ category: categoryDto(created) }, { status: 201 });
});
