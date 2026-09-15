import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import type { User, Wallet, Device } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { ApiError, forbidden, unauthorized } from "@/lib/errors";

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Envuelve un route handler: captura ApiError/ZodError y devuelve respuestas
 * de error consistentes. Nunca filtra detalles internos al cliente.
 */
export function route<C extends RouteContext = RouteContext>(
  handler: (req: NextRequest, ctx: C) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.flatten().fieldErrors;
        const first =
          Object.values(issues)
            .flat()
            .find(Boolean) ?? "Datos inválidos";
        return NextResponse.json(
          { error: { message: first, code: "VALIDATION_ERROR", issues } },
          { status: 422 }
        );
      }
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { message: err.message, code: err.code } },
          { status: err.status }
        );
      }
      console.error("[api] Error no controlado:", err);
      return NextResponse.json(
        { error: { message: "Error interno del servidor", code: "INTERNAL" } },
        { status: 500 }
      );
    }
  };
}

export interface AuthContext {
  user: User;
  wallet: Wallet;
  device: Device;
}

/**
 * Autenticación completa para endpoints de datos:
 * valida sesión JWT + dispositivo ACTIVO (los admins pueden pasar aunque su
 * dispositivo esté pendiente, para poder aprobarlo desde el panel).
 */
export async function requireUser(req: NextRequest): Promise<AuthContext> {
  const token = req.cookies.get("fp_session")?.value;
  if (!token) throw unauthorized();

  const session = await verifySessionToken(token);
  if (!session) throw unauthorized("Sesión inválida o expirada");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { wallet: true },
  });
  if (!user) throw unauthorized("Usuario no encontrado");

  // Usuarios con contraseña temporal (migrados) deben cambiarla antes de operar.
  // La ruta /api/auth/change-password usa requireSessionUser y no pasa por aquí.
  if (user.passwordReset) {
    throw new ApiError(403, "Debes cambiar tu contraseña temporal antes de continuar", "PASSWORD_RESET_REQUIRED");
  }

  const device = await prisma.device.findUnique({
    where: { userId_deviceId: { userId: user.id, deviceId: session.did } },
  });

  if (!device || device.status === "BLOCKED") {
    throw forbidden(device?.status === "BLOCKED" ? "Este dispositivo fue bloqueado" : "Dispositivo no registrado");
  }

  // Los admins no se bloquean por dispositivo pendiente (pueden aprobarse a sí mismos)
  if (device.status === "PENDING" && user.role !== "ADMIN") {
    throw new ApiError(403, "Tu dispositivo está pendiente de aprobación", "DEVICE_PENDING");
  }

  // Actualiza última actividad del dispositivo (fire-and-forget)
  void prisma.device
    .update({ where: { id: device.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  let wallet = user.wallet;
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: user.id } });
  }

  return { user, wallet, device };
}

export async function requireAdmin(req: NextRequest): Promise<AuthContext> {
  const ctx = await requireUser(req);
  if (ctx.user.role !== "ADMIN") throw forbidden("Se requiere rol de administrador");
  return ctx;
}

/** Registra una entrada en la bitácora de auditoría. */
export async function audit(entry: {
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetId: entry.targetId ?? null,
        meta: entry.meta as never,
      },
    });
  } catch (err) {
    console.error("[audit] No se pudo registrar:", err);
  }
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Cuerpo JSON inválido");
  }
}

/**
 * Cache-Control para respuestas de datos autenticados:
 * `private` (nunca CDN), `max-age=0` (no stale), `must-revalidate`.
 * SWR se encarga del stale-while-revalidate en el cliente.
 */
export function privateCache(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  return res;
}

/** Solo valida sesión JWT y existencia del usuario (sin chequear dispositivo). */
export async function requireSessionUser(req: NextRequest) {
  const token = req.cookies.get("fp_session")?.value;
  if (!token) throw unauthorized();

  const session = await verifySessionToken(token);
  if (!session) throw unauthorized("Sesión inválida o expirada");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { wallet: true },
  });
  if (!user) throw unauthorized("Usuario no encontrado");

  let wallet = user.wallet;
  if (!wallet) wallet = await prisma.wallet.create({ data: { userId: user.id } });

  return { user, wallet, sessionId: session.did };
}
