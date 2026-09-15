/**
 * Test de integración del flujo de recuperación de contraseña (corre en CI
 * contra Postgres efímero). Sin SMTP configurado, el mailer cae en modo log y
 * escribe el enlace en /tmp/reset-mail.log, de ahí se extrae el token real.
 */
import { NextRequest } from "next/server";
import fs from "node:fs";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";

const MAIL_LOG = "/tmp/reset-mail.log";

async function call(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<
    import("next/server").NextResponse
  >,
  payload: object
) {
  const req = new NextRequest("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await handler(req, { params: Promise.resolve({}) });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* sin cuerpo JSON */
  }
  return { status: res.status, body };
}

function die(message: string): never {
  console.error(`FALLO: ${message}`);
  process.exit(1);
}

function lastResetUrl(): string {
  const content = fs.readFileSync(MAIL_LOG, "utf8");
  const line = content.split("\n").findLast((l) => l.includes(" PASSWORD_RESET "));
  if (!line) die("el mailer de fallback no registró el enlace de reset");
  return line.split(" ").findLast((w) => w.startsWith("http")) ?? die("sin URL en el log del mailer");
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) die("DATABASE_URL no está definido");

  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "reset@example.com",
      passwordHash: await hashPassword("OldPassword123"),
      name: "Reset",
    },
  });

  const miss = await call(forgot, { email: "nadie@example.com" });
  if (miss.status !== 200) die(`forgot con email inexistente respondió ${miss.status} (esperaba 200)`);

  try {
    fs.rmSync(MAIL_LOG, { force: true });
  } catch {
    /* no existe */
  }

  const ok = await call(forgot, { email: "reset@example.com" });
  if (ok.status !== 200) die(`forgot respondió ${ok.status} (esperaba 200)`);

  const resetUrl = lastResetUrl();
  const raw = new URL(resetUrl).searchParams.get("token");
  if (!raw) die("el enlace no trae token");

  const row = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } });
  if (!row) die("no se creó el token de recuperación");
  if (row.tokenHash === raw) die("el token se guardó en claro en la BD");

  const applied = await call(reset, { token: raw, newPassword: "NewPassword456" });
  if (applied.status !== 200) die(`reset respondió ${applied.status} (esperaba 200)`);

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword("NewPassword456", fresh.passwordHash))) die("la nueva contraseña no se aplicó");
  if (await verifyPassword("OldPassword123", fresh.passwordHash)) die("la contraseña antigua sigue vigente");

  const again = await call(reset, { token: raw, newPassword: "AnotherPass789" });
  if (again.status !== 400) die(`token reutilizado respondió ${again.status} (esperaba 400)`);

  const bad = await call(reset, { token: "x".repeat(40), newPassword: "AnotherPass789" });
  if (bad.status !== 400) die(`token inventado respondió ${bad.status} (esperaba 400)`);

  const audits = await prisma.auditLog.count({
    where: { action: { in: ["PASSWORD_RESET_REQUESTED", "PASSWORD_RESET"] } },
  });
  if (audits < 2) die(`esperaba >= 2 eventos de auditoría, hay ${audits}`);

  console.log(
    "OK: forgot anti-enumeración, token solo en hash, reset 1 uso, 400 en reutilizado/inventado, auditoría registrada"
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});