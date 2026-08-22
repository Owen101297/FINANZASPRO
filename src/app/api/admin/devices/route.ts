import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireAdmin, readJson, audit } from "@/lib/server";
import { notFound, badRequest, ApiError } from "@/lib/errors";

/** Lista todos los dispositivos con su usuario (para el panel admin). */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);

  const devices = await prisma.device.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      label: d.label,
      status: d.status,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      user: d.user,
    })),
  });
});

/**
 * Cambia el estado de un dispositivo:
 *  - ACTIVE → aprueba acceso
 *  - BLOCKED → bloquea
 *  - PENDING → vuelve a dejar en espera
 */
export const PATCH = route(async (req: NextRequest) => {
  const { user: admin } = await requireAdmin(req);
  const body = (await readJson<{ deviceId?: string; status?: string }>(req));
  if (!body.deviceId || !body.status) throw badRequest("Faltan datos");
  if (!["ACTIVE", "BLOCKED", "PENDING"].includes(body.status)) {
    throw badRequest("Estado inválido");
  }

  const device = await prisma.device.findUnique({
    where: { id: body.deviceId },
    include: { user: true },
  });
  if (!device) throw notFound("Dispositivo no encontrado");

  // Los dispositivos de admins siempre quedan activos
  const status =
    device.user.role === "ADMIN" && body.status !== "BLOCKED" ? "ACTIVE" : body.status;

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { status: status as never },
  });

  await audit({
    actorId: admin.id,
    action:
      status === "ACTIVE" ? "DEVICE_APPROVED" : status === "BLOCKED" ? "DEVICE_BLOCKED" : "DEVICE_PENDING",
    targetId: updated.id,
    meta: { userId: device.userId, deviceId: device.deviceId },
  });

  return NextResponse.json({ device: { id: updated.id, status: updated.status } });
});

/** Elimina un dispositivo autorizado. */
export const DELETE = route(async (req: NextRequest) => {
  const { user: admin } = await requireAdmin(req);
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) throw badRequest("Falta deviceId");

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw notFound("Dispositivo no encontrado");
  if (device.userId === admin.id && device.status === "ACTIVE") {
    throw new ApiError(409, "No puedes eliminar tu propio dispositivo activo");
  }

  await prisma.device.delete({ where: { id: deviceId } });

  await audit({ actorId: admin.id, action: "DEVICE_DELETED", targetId: deviceId });
  return NextResponse.json({ ok: true });
});
