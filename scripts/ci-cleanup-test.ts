/**
 * Test de integración de la purga de datos antiguos (corre en CI contra
 * Postgres efímero). Ejecuta el route handler real POST /api/admin/data-cleanup
 * y verifica el invariante de P8: solo un ADMIN puede dispararla, y borra
 * estrictamente lo que corresponde — audit_logs > 365 días, tokens de reset
 * usados/vencidos y devices inactivos > 180 días — sin tocar los datos
 * recientes ni el device activo del propio admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession } from "@/lib/auth";
import { POST } from "@/app/api/admin/data-cleanup/route";

const DAYS = 86_400_000;

function die(message: string): never {
  console.error(`FALLO: ${message}`);
  process.exit(1);
}

async function call(cookie: string): Promise<{ status: number; body: any }> {
  const req = new NextRequest("http://localhost/api/admin/data-cleanup", {
    method: "POST",
    headers: { cookie: `fp_session=${cookie}` },
  });
  const res = await POST(req, { params: Promise.resolve({}) });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* sin cuerpo JSON */
  }
  return { status: res.status, body };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) die("DATABASE_URL no está definido");
  if (!process.env.AUTH_SECRET) die("AUTH_SECRET no está definido");

  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "cleanup-admin@example.com",
      passwordHash: await hashPassword("CleanupAdmin123"),
      name: "Cleanup Admin",
      role: "ADMIN",
    },
  });
  const member = await prisma.user.create({
    data: {
      email: "cleanup-user@example.com",
      passwordHash: await hashPassword("CleanupUser123"),
      name: "Cleanup User",
      role: "USER",
    },
  });

  const now = Date.now();
  await prisma.device.createMany({
    data: [
      // Device activo del admin (se conserva: no es inactivo).
      { userId: admin.id, deviceId: "ci-admin-active", status: "ACTIVE", lastSeenAt: new Date(now - 1 * DAYS) },
      // Device del admin sin actividad: debe borrarse.
      { userId: admin.id, deviceId: "ci-admin-stale", status: "ACTIVE", lastSeenAt: new Date(now - 400 * DAYS), createdAt: new Date(now - 400 * DAYS) },
      // Device nunca visto y viejo: debe borrarse.
      { userId: admin.id, deviceId: "ci-admin-never", status: "PENDING", lastSeenAt: null, createdAt: new Date(now - 400 * DAYS) },
      // Device reciente del miembro (se conserva).
      { userId: member.id, deviceId: "ci-user-active", status: "ACTIVE", lastSeenAt: new Date(now - 1 * DAYS) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: "TEST_OLD_1", meta: { p: "a" }, createdAt: new Date(now - 400 * DAYS) },
      { actorId: admin.id, action: "TEST_OLD_2", meta: { p: "a" }, createdAt: new Date(now - 401 * DAYS) },
      { actorId: admin.id, action: "TEST_OLD_3", meta: { p: "a" }, createdAt: new Date(now - 800 * DAYS) },
      { actorId: admin.id, action: "TEST_RECENT", meta: { p: "a" }, createdAt: new Date(now - 1 * DAYS) },
    ],
  });

  await prisma.passwordResetToken.createMany({
    data: [
      { userId: member.id, tokenHash: "h_old_expired", expiresAt: new Date(now - 10 * 60_000), createdAt: new Date(now - 1 * DAYS) },
      { userId: member.id, tokenHash: "h_old_used", expiresAt: new Date(now + 30 * 60_000), usedAt: new Date(now - 5 * 60_000), createdAt: new Date(now - 1 * DAYS) },
      { userId: member.id, tokenHash: "h_recent_active", expiresAt: new Date(now + 50 * 60_000), usedAt: null, createdAt: new Date(now - 1 * DAYS) },
    ],
  });

  const adminCookie = await signSession({ sub: admin.id, role: "ADMIN", did: "ci-admin-active" });
  const userCookie = await signSession({ sub: member.id, role: "USER", did: "ci-user-active" });

  // 1) Un miembro (USER) no puede disparar la purga: 403 y nada se borra.
  const denied = await call(userCookie);
  if (denied.status !== 403) die(`admin/data-cleanup con USER respondió ${denied.status} (esperaba 403)`);
  if ((await prisma.auditLog.count()) !== 4) die("el 403 del USER ya modificó datos");

  // 2) El admin dispara la purga y recibe los conteos correctos.
  const run = await call(adminCookie);
  if (run.status !== 200) die(`admin/data-cleanup respondió ${run.status} (esperaba 200)`);
  const deleted = run.body.deleted;

  if (deleted.auditLogsDeleted !== 3) die(`audit viejos borrados=${deleted.auditLogsDeleted} (esperaba 3)`);
  if (deleted.expiredTokensDeleted !== 2) die(`tokens borrados=${deleted.expiredTokensDeleted} (esperaba 2)`);
  if (deleted.devicesDeleted !== 2) die(`devices inactivos borrados=${deleted.devicesDeleted} (esperaba 2)`);

  // 3) Solo quedan los datos recientes.
  const remainingAudit = await prisma.auditLog.count();
  // 1 reciente sembrado + 1 DATA_CLEANUP_RUN de la propia ejecución.
  if (remainingAudit !== 2) die(`quedan ${remainingAudit} audit_logs (esperaba 2)`);
  const oldStale = await prisma.auditLog.count({ where: { createdAt: { lt: new Date(now - 364 * DAYS) } } });
  if (oldStale !== 0) die("quedan audit_logs más antiguos que la retención");

  const tokens = await prisma.passwordResetToken.count();
  if (tokens !== 1) die(`quedan ${tokens} tokens de reset (esperaba solo el activo)`);
  const survivor = await prisma.passwordResetToken.findFirst();
  if (survivor?.tokenHash !== "h_recent_active") die("se borró el token activo no vencido");

  const devices = await prisma.device.count();
  if (devices !== 2) die(`quedan ${devices} devices (esperaba activo del admin + activo del miembro)`);
  const kept = await prisma.device.findMany({ select: { deviceId: true } });
  const keptIds = kept.map((d) => d.deviceId).sort();
  if (keptIds.join(",") !== "ci-admin-active,ci-user-active") die(`se borró un device activo: ${keptIds.join(",")}`);

  console.log("OK: purga borra solo lo antiguo (audit >365d, tokens usados/vencidos, devices inactivos) y exige rol ADMIN; 403 para USER");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});