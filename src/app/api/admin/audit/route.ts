import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireAdmin } from "@/lib/server";

/** Bitácora de auditoría (más recientes primero). */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);

  const take = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "100") || 100, 300);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { email: true, name: true } } },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      targetId: l.targetId,
      meta: l.meta,
      createdAt: l.createdAt.toISOString(),
      actorEmail: l.actor?.email ?? null,
      actorName: l.actor?.name ?? null,
    })),
  });
});
