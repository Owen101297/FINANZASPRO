import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE, sessionCookieOptions, csrfCookieOptions } from "@/lib/auth";
import { CSRF_COOKIE, generateCsrfToken } from "@/lib/csrf";
import { route, readJson, audit } from "@/lib/server";
import { unauthorized, forbidden, tooMany } from "@/lib/errors";
import { loginSchema } from "@/lib/validations";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const DEVICE_COOKIE = "fp_device";

function deviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

/**
 * Login con email + contraseña. Registra/actualiza el dispositivo que envía
 * el cliente:
 *  - Dispositivo nuevo o pendiente → estado PENDING (el admin debe aprobarlo).
 *  - Dispositivo bloqueado → se rechaza el login.
 *  - Admins → su dispositivo queda ACTIVE automáticamente.
 */
export const POST = route(async (req: NextRequest) => {
  const { email, password, deviceId } = loginSchema.parse(await readJson(req));

  // Mitigación de fuerza bruta por IP + email
  const attempt = rateLimit(`login:${clientIp(req)}:${email}`, {
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!attempt.allowed) throw tooMany("Demasiados intentos fallidos. Espera unos minutos.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    // Mensaje genérico para no filtrar si el email existe
    throw unauthorized("Credenciales incorrectas");
  }

  const existingDevice = await prisma.device.findUnique({
    where: { userId_deviceId: { userId: user.id, deviceId } },
  });

  if (existingDevice?.status === "BLOCKED") {
    throw forbidden("Este dispositivo fue bloqueado por un administrador");
  }

  const deviceStatus =
    existingDevice?.status === "ACTIVE" ? "ACTIVE" : user.role === "ADMIN" ? "ACTIVE" : "PENDING";

  await prisma.device.upsert({
    where: { userId_deviceId: { userId: user.id, deviceId } },
    create: {
      userId: user.id,
      deviceId,
      status: deviceStatus,
      lastSeenAt: new Date(),
    },
    update: {
      status: deviceStatus,
      lastSeenAt: new Date(),
    },
  });

  const token = await signSession({ sub: user.id, role: user.role, did: deviceId });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    deviceStatus,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  response.cookies.set(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions());
  response.cookies.set(DEVICE_COOKIE, deviceId, deviceCookieOptions());

  await audit({
    actorId: user.id,
    action: deviceStatus === "PENDING" ? "LOGIN_DEVICE_PENDING" : "LOGIN",
    targetId: user.id,
    meta: { deviceId },
  });

  return response;
});
