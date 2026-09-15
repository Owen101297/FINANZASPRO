import { NextRequest, NextResponse } from "next/server";
import { route, requireAdmin, audit } from "@/lib/server";
import { runDataCleanup } from "@/lib/cleanup";

/**
 * Ejecuta la purga de datos antiguos (audit_logs, tokens de reset vencidos/
 * usados y devices inactivos) bajo demanda, con bitácora del resultado.
 */
export const POST = route(async (req: NextRequest) => {
  const { user } = await requireAdmin(req);

  const deleted = await runDataCleanup();

  await audit({
    actorId: user.id,
    action: "DATA_CLEANUP_RUN",
    meta: { ...deleted },
  });

  return NextResponse.json({ ok: true, deleted });
});