/**
 * Test de integración del bootstrap de admin (corre en CI contra Postgres
 * efímero). Ejecuta el route handler real de /api/auth/register y verifica el
 * invariante del fix: con DOS registros simultáneos sobre una base vacía,
 * exactamente UN usuario nace como ADMIN (aislamiento SERIALIZABLE + reintento).
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/auth/register/route";

type Result = { status: number; body: unknown };

async function postRegister(payload: object): Promise<Result> {
  const req = new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
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

function die(message: string): never {
  console.error(`FALLO: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) die("DATABASE_URL no está definido");

  await prisma.user.deleteMany();

  const [a, b] = await Promise.all([
    postRegister({ email: "user1@example.com", password: "Password123", name: "Uno" }),
    postRegister({ email: "user2@example.com", password: "Password123", name: "Dos" }),
  ]);

  for (const r of [a, b]) {
    if (r.status !== 201) {
      console.error("respuesta inesperada:", JSON.stringify(r.body));
      die(`status ${r.status} (esperaba 201)`);
    }
  }

  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (admins !== 1) die(`bootstrap roto: ${admins} admins (esperaba 1)`);
  if ((await prisma.user.count()) !== 2) die("esperaba 2 usuarios");
  if ((await prisma.wallet.count()) !== 2) die("esperaba 2 wallets");

  const categories = await prisma.category.count();
  if (categories !== 20) die(`esperaba 20 categorías por defecto, hay ${categories}`);

  const dup = await postRegister({ email: "user1@example.com", password: "Password123" });
  if (dup.status !== 409) die(`email duplicado respondió ${dup.status} (esperaba 409)`);

  const roles = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { email: "asc" },
  });
  console.log("users:", JSON.stringify(roles));
  console.log(
    `OK: 2 usuarios concurrentes, 2 wallets, ${categories} categorías, 1 único ADMIN, 409 en duplicado`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});