import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { route, readJson, audit } from "@/lib/server";
import { unauthorized, forbidden } from "@/lib/errors";
import { loginSchema } from "@/lib/validations";

/**
 * Login con email + contraseña. Registra/actualiza el dispositivo que envía
 * el cliente:
 *  - Dispositivo nuevo o pendiente → estado PENDING (el admin debe aprobarlo).
 *  - Dispositivo bloqueado → se rechaza el login.
 *  - Admins → su dispositivo queda ACTIVE automáticamente.
 */
export const POST = route(async (req: NextRequest) => {
  const { email, password, deviceId } = loginSchema.parse(await readJson(req));

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

  await audit({
    actorId: user.id,
    action: deviceStatus === "PENDING" ? "LOGIN_DEVICE_PENDING" : "LOGIN",
    targetId: user.id,
    meta: { deviceId },
  });

  return response;
});
