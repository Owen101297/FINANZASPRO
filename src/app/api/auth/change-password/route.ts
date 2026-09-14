import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireSessionUser, readJson, audit } from "@/lib/server";
import { unauthorized, tooMany } from "@/lib/errors";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual").max(72),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(72),
});

/**
 * Cambio de contraseña autenticado: verifica la actual y reemplaza el hash.
 * Usa requireSessionUser (sin gate de passwordReset) para que un usuario con
 * contraseña temporal pueda cambiarla y desbloquear su cuenta.
 */
export const POST = route(async (req: NextRequest) => {
  const { user } = await requireSessionUser(req);
  const body = changePasswordSchema.parse(await readJson(req));

  const attempt = rateLimit(`change-password:${user.id}`, { max: 5, windowMs: 15 * 60 * 1000 });
  if (!attempt.allowed) throw tooMany("Demasiados intentos. Espera unos minutos.");

  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) throw unauthorized("La contraseña actual es incorrecta");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.newPassword),
      passwordReset: false,
    },
  });

  await audit({ actorId: user.id, action: "PASSWORD_CHANGED", targetId: user.id });

  return NextResponse.json({ ok: true });
});
