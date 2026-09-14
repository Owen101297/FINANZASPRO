import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { route, readJson, audit } from "@/lib/server";
import { conflict, tooMany } from "@/lib/errors";
import { registerSchema } from "@/lib/validations";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Registro de usuarios. El primer usuario del sistema se convierte en ADMIN
 * (bootstrap). Crea wallet + categorías por defecto.
 */
export const POST = route(async (req: NextRequest) => {
  const body = registerSchema.parse(await readJson(req));

  const attempt = rateLimit(`register:${clientIp(req)}`, { max: 5, windowMs: 10 * 60 * 1000 });
  if (!attempt.allowed) throw tooMany("Demasiados registros desde esta IP. Espera unos minutos.");

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw conflict("Ya existe una cuenta con este email");

  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  const passwordHash = await hashPassword(body.password);

  let user: { id: string; email: string; name: string | null; role: string };
  try {
    user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name ?? null,
        passwordHash,
        role: isFirstUser ? "ADMIN" : "USER",
        wallet: {
          create: {
            salary: 0,
            cycleStartDay: 1,
            categories: {
              create: [
                { name: "Salario", type: "INCOME", color: "#10b981", icon: "briefcase" },
                { name: "Otros ingresos", type: "INCOME", color: "#34d399", icon: "plus-circle" },
                { name: "Supermercado", type: "EXPENSE", color: "#f59e0b", icon: "shopping-cart" },
                { name: "Transporte", type: "EXPENSE", color: "#3b82f6", icon: "car" },
                { name: "Hogar", type: "EXPENSE", color: "#8b5cf6", icon: "home" },
                { name: "Restaurantes", type: "EXPENSE", color: "#ec4899", icon: "utensils" },
                { name: "Salud", type: "EXPENSE", color: "#ef4444", icon: "heart-pulse" },
                { name: "Entretenimiento", type: "EXPENSE", color: "#a78bfa", icon: "clapperboard" },
                { name: "Servicios", type: "EXPENSE", color: "#06b6d4", icon: "receipt" },
                { name: "Otros gastos", type: "EXPENSE", color: "#6b7280", icon: "circle-ellipsis" },
              ],
            },
          },
        },
      },
      select: { id: true, email: true, name: true, role: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict("Ya existe una cuenta con este email");
    }
    throw err;
  }

  await audit({
    actorId: user.id,
    action: "USER_REGISTERED",
    targetId: user.id,
    meta: { role: user.role, firstUser: isFirstUser },
  });

  return NextResponse.json({ user }, { status: 201 });
});
