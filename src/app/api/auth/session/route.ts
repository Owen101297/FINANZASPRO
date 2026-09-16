import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server";
import { logError } from "@/lib/logger";

/** Devuelve la sesión actual: usuario + estado del dispositivo. */
export const GET = route(async (req: NextRequest) => {
  const token = req.cookies.get("fp_session")?.value;
  if (!token) return NextResponse.json({ user: null, deviceStatus: null });

  try {
    const { verifySessionToken } = await import("@/lib/auth");
    const session = await verifySessionToken(token);
    if (!session) return NextResponse.json({ user: null, deviceStatus: null });

    const [user, device] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.sub },
        select: { id: true, email: true, name: true, role: true, passwordReset: true },
      }),
      prisma.device.findUnique({
        where: { userId_deviceId: { userId: session.sub, deviceId: session.did } },
        select: { status: true },
      }),
    ]);

    return NextResponse.json({
      user,
      deviceStatus: device?.status ?? null,
    });
  } catch (err) {
    logError("session", "Error al verificar sesión", err);
    // Devolver null en vez de 500 para no bloquear al cliente
    return NextResponse.json({ user: null, deviceStatus: null });
  }
});
