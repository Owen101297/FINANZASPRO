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
 *
 * La detección del primer usuario ocurre DENTRO de una transacción SERIALIZABLE:
 * si dos registros compiten por el rol ADMIN sobre una base vacía, PostgreSQL
 * aborta el perdedor con P2034 (write-skew) y este código reintenta — el ganador
 * ya tomó el rol, así que el reintento nace como USER. Garantiza un único ADMIN.
 */
export const POST = route(async (req: NextRequest) => {
  const body = registerSchema.parse(await readJson(req));

  const attempt = rateLimit(`register:${clientIp(req)}`, { max: 5, windowMs: 10 * 60 * 1000 });
  if (!attempt.allowed) throw tooMany("Demasiados registros desde esta IP. Espera unos minutos.");

  const passwordHash = await hashPassword(body.password);

  const { user, isFirstUser } = await createUserAndWallet({
    email: body.email,
    name: body.name ?? null,
    passwordHash,
  });

  await audit({
    actorId: user.id,
    action: "USER_REGISTERED",
    targetId: user.id,
    meta: { role: user.role, firstUser: isFirstUser },
  });

  return NextResponse.json({ user }, { status: 201 });
});

const DEFAULT_CATEGORIES: { name: string; type: "INCOME" | "EXPENSE"; color: string; icon: string }[] = [
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
];

type StoredUser = { id: string; email: string; name: string | null; role: string };

type RegisterInput = {
  email: string;
  name: string | null;
  passwordHash: string;
};

/** Crea usuario + wallet + categorías de forma atómica (bootstrap de admin). */
async function createUserAndWallet(
  input: RegisterInput
): Promise<{ user: StoredUser; isFirstUser: boolean }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const isFirstUser = (await tx.user.count()) === 0;
          const user = await tx.user.create({
            data: {
              email: input.email,
              name: input.name,
              passwordHash: input.passwordHash,
              role: isFirstUser ? "ADMIN" : "USER",
              wallet: {
                create: {
                  salary: 0,
                  cycleStartDay: 1,
                  categories: { create: DEFAULT_CATEGORIES },
                },
              },
            },
            select: { id: true, email: true, name: true, role: true },
          });
          return { user, isFirstUser };
        },
        { isolationLevel: "Serializable", maxWait: 2000, timeout: 10000 }
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2034") {
          // Write-skew entre registros simultáneos sobre DB vacía: reintenta,
          // ahora como USER (el ganador ya tomó el rol ADMIN).
          if (attempt >= 3) throw err;
          continue;
        }
        if (err.code === "P2002") {
          throw conflict("Ya existe una cuenta con este email");
        }
      }
      throw err;
    }
  }
}
