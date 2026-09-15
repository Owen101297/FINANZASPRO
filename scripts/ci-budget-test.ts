/**
 * Test de integración de la alerta de presupuesto (corre en CI contra Postgres
 * efímero). Ejecuta los route handlers reales POST /api/transactions y
 * PATCH|DELETE /api/transactions/:id y verifica el invariante de P7:
 * BUDGET_ALERT se dispara solo cuando el total de gastos del ciclo CRUZA el 90%
 * del salario, tanto al crear como al editar (subir un gasto o pasar de ingreso
 * a gasto), y NUNCA al borrar (el total solo baja).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession } from "@/lib/auth";
import { POST } from "@/app/api/transactions/route";
import { PATCH, DELETE } from "@/app/api/transactions/[id]/route";

type Params = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: Params) => Promise<NextResponse>;

function die(message: string): never {
  console.error(`FALLO: ${message}`);
  process.exit(1);
}

async function call(
  handler: Handler,
  cookie: string,
  method: string,
  path: string,
  payload?: object,
  params?: Record<string, string>
): Promise<{ status: number; body: any }> {
  const req = new NextRequest(`http://localhost${path}`, {
    method,
    headers: { cookie: `fp_session=${cookie}`, "content-type": "application/json" },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
  const res = await handler(req, { params: Promise.resolve(params ?? {}) });
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

  const user = await prisma.user.create({
    data: {
      email: "budget@example.com",
      passwordHash: await hashPassword("BudgetPass123"),
      name: "Budget",
      role: "ADMIN",
      wallet: { create: { salary: 1000, cycleStartDay: 1 } },
    },
  });
  await prisma.device.create({
    data: { userId: user.id, deviceId: "ci-device", status: "ACTIVE" },
  });

  const cookie = await signSession({ sub: user.id, role: "ADMIN", did: "ci-device" });

  const budgetAudits = () =>
    prisma.auditLog.count({ where: { actorId: user.id, action: "BUDGET_ALERT" } });

  // 1) Crear un gasto de 800 (80%): por debajo del 90%, sin alerta.
  const created = await call(POST, cookie, "POST", "/api/transactions", {
    type: "EXPENSE",
    amount: 800,
  });
  if (created.status !== 201) die(`crear gasto respondió ${created.status} (esperaba 201)`);
  if (created.body.budgetAlert !== false) die("crear 800 (80%) disparó alerta estando bajo el 90%");
  const expenseId = created.body.transaction.id as string;

  // 2) Crear un ingreso de 900: nunca puede cruzar (no aporta al total de gastos).
  const income = await call(POST, cookie, "POST", "/api/transactions", {
    type: "INCOME",
    amount: 900,
  });
  if (income.status !== 201) die(`crear ingreso respondió ${income.status} (esperaba 201)`);
  if (income.body.budgetAlert !== false) die("crear un ingreso disparó alerta");
  const incomeId = income.body.transaction.id as string;

  // 3) Editar el gasto a 950 (95%): CRUZA el umbral -> alerta + evento.
  const up = await call(PATCH, cookie, "PATCH", `/api/transactions/${expenseId}`, {
    amount: 950,
  }, { id: expenseId });
  if (up.status !== 200) die(`editar a 950 respondió ${up.status} (esperaba 200)`);
  if (up.body.budgetAlert !== true) die("subir 800->950 no disparó la alerta de cruce");
  if ((await budgetAudits()) !== 1) die("esperaba 1 evento BUDGET_ALERT tras cruzar");

  // 4) Editar a 980: ya estaba sobre el 90%, no es un cruce nuevo.
  const over = await call(PATCH, cookie, "PATCH", `/api/transactions/${expenseId}`, {
    amount: 980,
  }, { id: expenseId });
  if (over.body.budgetAlert !== false) die("editar ya estando sobre el 90% repitió la alerta");
  if ((await budgetAudits()) !== 1) die("se registró más de un BUDGET_ALERT sin cruce nuevo");

  // 5) Editar a 850: vuelve a bajar del umbral, sin alerta.
  const down = await call(PATCH, cookie, "PATCH", `/api/transactions/${expenseId}`, {
    amount: 850,
  }, { id: expenseId });
  if (down.body.budgetAlert !== false) die("bajar del 90% debería quedar sin alerta");
  if ((await budgetAudits()) !== 1) die("bajar del umbral registró un BUDGET_ALERT");

  // 6) Convertir el ingreso de 900 en gasto de 950: cruce desde 0 -> alerta.
  const convert = await call(PATCH, cookie, "PATCH", `/api/transactions/${incomeId}`, {
    type: "EXPENSE",
    amount: 950,
  }, { id: incomeId });
  if (convert.body.budgetAlert !== true) die("ingreso->gasto que cruza no disparó la alerta");
  if ((await budgetAudits()) !== 2) die("esperaba 2 eventos BUDGET_ALERT en total");

  // 7) Borrar el primer gasto: el total baja, el umbral nunca se cruza hacia arriba.
  const del = await call(DELETE, cookie, "DELETE", `/api/transactions/${expenseId}`, undefined, {
    id: expenseId,
  });
  if (del.status !== 200) die(`borrar respondió ${del.status} (esperaba 200)`);
  if ((await budgetAudits()) !== 2) die("borrar un gasto registró BUDGET_ALERT (no debería)");

  console.log(
    "OK: alerta solo al cruzar el 90% (crear/editar/ingreso->gasto), nunca al borrar; 2 eventos auditados"
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});