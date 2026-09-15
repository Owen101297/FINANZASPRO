import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, readJson, audit } from "@/lib/server";
import { resetPasswordSchema } from "@/lib/validations";
import { badRequest, tooMany } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth";
import { consumePasswordReset } from "@/lib/reset";

/**
 * Aplica una nueva contraseña con el token de recuperación. El token es de un
 * solo uso, caduca a los 60 min y al consumirlo se invalidan los demás tokens
 * del mismo usuario.
 */
export const POST = route(async (req: NextRequest) => {
  const { token, newPassword } = resetPasswordSchema.parse(await readJson(req));

  const attempt = rateLimit(`reset:${clientIp(req)}`, {
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!attempt.allowed) throw tooMany("Demasiados intentos. Espera unos minutos.");

  const userId = await consumePasswordReset(token);
  if (!userId) {
    throw badRequest("El enlace es inválido o ya fue usado. Solicita uno nuevo.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordReset: false,
    },
  });

  await audit({ actorId: userId, action: "PASSWORD_RESET", targetId: userId });

  return NextResponse.json({ ok: true });
});