import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireSessionUser, readJson, audit } from "@/lib/server";
import { deviceRegisterSchema } from "@/lib/validations";

/**
 * Registra el dispositivo actual del usuario autenticado. Es la única llamada
 * permitida con dispositivo PENDING (para que quede visible en el panel admin).
 */
export const POST = route(async (req: NextRequest) => {
  const { user, sessionId } = await requireSessionUser(req);
  const body = deviceRegisterSchema.parse(await readJson(req));

  const existing = await prisma.device.findUnique({
    where: { userId_deviceId: { userId: user.id, deviceId: body.deviceId } },
  });

  if (existing?.status === "BLOCKED") {
    return NextResponse.json({ deviceStatus: "BLOCKED" }, { status: 403 });
  }

  const status =
    existing?.status === "ACTIVE" || user.role === "ADMIN" ? "ACTIVE" : "PENDING";

  await prisma.device.upsert({
    where: { userId_deviceId: { userId: user.id, deviceId: body.deviceId } },
    create: {
      userId: user.id,
      deviceId: body.deviceId,
      label: body.label ?? null,
      status,
      lastSeenAt: new Date(),
    },
    update: { label: body.label ?? null, lastSeenAt: new Date() },
  });

  void audit({
    actorId: user.id,
    action: "DEVICE_REGISTERED",
    targetId: body.deviceId,
    meta: { status },
  });

  return NextResponse.json({ deviceStatus: status });
});
