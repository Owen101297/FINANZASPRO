import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, readJson, audit } from "@/lib/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { tooMany } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPasswordReset } from "@/lib/reset";
import { sendPasswordResetMail } from "@/lib/mailer";

/**
 * Solicitud de recuperación de contraseña. Responde siempre el mismo cuerpo
 * (anti-enumeración): no se revela si el email existe en la plataforma.
 */
export const POST = route(async (req: NextRequest) => {
  const { email } = forgotPasswordSchema.parse(await readJson(req));

  const attempt = rateLimit(`forgot:${clientIp(req)}:${email}`, {
    max: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!attempt.allowed) throw tooMany("Demasiadas solicitudes. Espera unos minutos.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const raw = await createPasswordReset(user.id);
    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${raw}`;
    await sendPasswordResetMail(user.email, resetUrl);
    await audit({ actorId: user.id, action: "PASSWORD_RESET_REQUESTED", targetId: user.id });
  }

  return NextResponse.json({ ok: true });
});