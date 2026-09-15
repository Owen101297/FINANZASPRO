import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireUser } from "@/lib/server";

/**
 * Lista de admins con sus cuentas (solo lectura).
 * Cualquier usuario autenticado puede verla.
 */
export const GET = route(async (req) => {
  await requireUser(req);

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      wallet: {
        select: {
          accounts: {
            where: { archived: false },
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    admins: admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      accounts: a.wallet?.accounts ?? [],
    })),
  });
});
