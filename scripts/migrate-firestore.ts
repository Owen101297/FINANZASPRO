/**
 * Migración one-off: Firestore (wallets_v4 + authorized_devices) → PostgreSQL.
 *
 * Uso local:
 *   1. Descarga el service account JSON de Firebase (Project settings → Service accounts)
 *   2. Configura .env: DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_PATH
 *   3. npm run migrate:firestore
 *
 * Uso en Railway (startCommand temporal): define además
 *   FIREBASE_SERVICE_ACCOUNT_JSON_B64 = base64 del JSON del service account
 *
 * Decisiones de mapeo (documentadas en README):
 *   - Email sintético: `<cedula>@finanzaspro.app` (la app antigua usaba `<cedula>@gmail.com` interno).
 *   - Contraseña temporal para todos: MIGRATE_TEMP_PASSWORD (default "Cambio123*"), flag passwordReset=true.
 *   - El primer usuario migrado queda como ADMIN.
 *   - Incomes con isTransfer=true se omiten (las cuentas ya traen su saldo final).
 */
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

interface LegacyExpense {
  amt?: number | string;
  category?: string;
  source?: string;
  date?: string;
  desc?: string;
  isTransfer?: boolean;
}
interface LegacyIncome extends LegacyExpense {}
interface LegacyAccount {
  name?: string;
  balance?: number | string;
}
interface LegacyDebt {
  person?: string;
  creditor?: string;
  name?: string;
  amount?: number | string;
}
interface LegacySubscription {
  name?: string;
  servicio?: string;
  amt?: number | string;
  day?: number;
}
interface LegacyGoal {
  name?: string;
  targetAmt?: number | string;
  currentAmt?: number | string;
}
interface LegacyWallet {
  name?: string;
  salary?: number | string;
  expenses?: LegacyExpense[];
  incomes?: LegacyIncome[];
  accounts?: LegacyAccount[];
  categories?: Array<{ name?: string }>;
  incomeCategories?: Array<{ name?: string }>;
  debts?: LegacyDebt[];
  subscriptions?: LegacySubscription[];
  goals?: LegacyGoal[];
}

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

/** Convierte fechas "DD/MM/YYYY" o ISO a Date. Devuelve null si es inválida. */
function parseLegacyDate(raw?: string): Date | null {
  if (!raw) return null;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw.trim());
  if (dmy) {
    const [, d, m, y] = dmy.map(Number) as unknown as [string, number, number, number];
    return new Date(y!, m! - 1, d!);
  }
  const iso = new Date(raw);
  return isNaN(iso.getTime()) ? null : iso;
}

function toNum(v: number | string | undefined): number {
  const n = Number(v ?? 0);
  return isFinite(n) ? n : 0;
}

async function main() {
  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saJsonB64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;
  const tempPassword = process.env.MIGRATE_TEMP_PASSWORD ?? "Cambio123*";

  console.log(`▸ Proyecto Firebase: ${projectId}`);

  if (!getApps().length) {
    let credentialsJson: string;
    if (saJsonB64) {
      credentialsJson = Buffer.from(saJsonB64, "base64").toString("utf8");
      console.log("▸ Credenciales leídas de FIREBASE_SERVICE_ACCOUNT_JSON_B64");
    } else if (saPath) {
      credentialsJson = readFileSync(saPath, "utf8");
      console.log(`▸ Credenciales leídas de ${saPath}`);
    } else {
      throw new Error(
        "Define FIREBASE_SERVICE_ACCOUNT_PATH (archivo) o FIREBASE_SERVICE_ACCOUNT_JSON_B64 (base64)"
      );
    }
    initializeApp({ credential: cert(JSON.parse(credentialsJson)), projectId });
  }
  const firestore = getFirestore();

  // ── 1. Mapa wallet_id → cédula (desde authorized_devices) ──
  console.log("▸ Leyendo authorized_devices…");
  const devicesSnap = await firestore.collection("authorized_devices").get();
  const cedulaByWallet = new Map<string, string>();
  const devicesByWallet = new Map<string, Array<{ id: string; active: boolean }>>();
  for (const doc of devicesSnap.docs) {
    const data = doc.data() as { cedula?: string; wallet_id?: string; active?: boolean };
    if (!data.wallet_id) continue;
    if (data.cedula && !cedulaByWallet.has(data.wallet_id)) {
      cedulaByWallet.set(data.wallet_id, data.cedula.trim().toLowerCase());
    }
    const list = devicesByWallet.get(data.wallet_id) ?? [];
    list.push({ id: doc.id, active: Boolean(data.active) });
    devicesByWallet.set(data.wallet_id, list);
  }
  console.log(`  ${devicesSnap.size} dispositivos encontrados`);

  // ── 2. Migrar wallets ──
  console.log("▸ Leyendo wallets_v4…");
  const walletsSnap = await firestore.collection("wallets_v4").get();
  console.log(`  ${walletsSnap.size} wallets encontrados`);

  const passwordHash = await bcrypt.hash(tempPassword, 12);

  let first = true;
  let usersCreated = 0;
  let usersFailed = 0;

  for (const doc of walletsSnap.docs) {
    const uid = doc.id;
    try {
      const w = doc.data() as LegacyWallet;
      const cedula = cedulaByWallet.get(uid) ?? uid.toLowerCase();
      const email = `${cedula}@finanzaspro.app`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ↷ ${email} ya existe, se omite`);
      continue;
    }

    const role = first ? "ADMIN" : "USER";

    const user = await prisma.user.create({
      data: {
        email,
        name: w.name?.trim() || null,
        passwordHash,
        role,
        legacyCedula: cedula,
        passwordReset: true,
        wallet: { create: { salary: toNum(w.salary), cycleStartDay: 1 } },
      },
    });
    first = false;
    usersCreated++;

    const walletId = (
      await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } })
    ).id;

    // ── Cuentas ──
    const accountMap = new Map<string, string>(); // nombre → id
    for (const acc of w.accounts ?? []) {
      const name = String(acc.name ?? "").trim();
      if (!name || accountMap.has(name)) continue;
      const created = await prisma.account.create({
        data: { walletId, name, balance: new Prisma.Decimal(toNum(acc.balance)) },
      });
      accountMap.set(name, created.id);
    }

    // ── Categorías (gastos + ingresos, dedupe por nombre) ──
    const catIdByKey = new Map<string, string>();
    async function ensureCategory(nameRaw: string, type: "INCOME" | "EXPENSE") {
      const name = nameRaw.trim().slice(0, 40);
      if (!name) return null;
      const key = `${type}:${name}`;
      const existingId = catIdByKey.get(key);
      if (existingId) return existingId;
      const found = await prisma.category.findFirst({
        where: { walletId, name, type },
        select: { id: true },
      });
      const id =
        found?.id ??
        (
          await prisma.category.create({ data: { walletId, name, type } })
        ).id;
      catIdByKey.set(key, id);
      return id;
    }
    for (const c of w.categories ?? []) if (c.name) await ensureCategory(c.name, "EXPENSE");
    for (const c of w.incomeCategories ?? []) if (c.name) await ensureCategory(c.name, "INCOME");

    // ── Transacciones: gastos ──
    let txCount = 0;
    for (const e of w.expenses ?? []) {
      const amount = toNum(e.amt);
      if (amount <= 0) continue;
      const date = parseLegacyDate(e.date) ?? new Date();
      const categoryId = e.category ? await ensureCategory(e.category, "EXPENSE") : null;
      await prisma.transaction.create({
        data: {
          walletId,
          type: "EXPENSE",
          amount: new Prisma.Decimal(amount),
          note: e.desc?.slice(0, 200) ?? null,
          accountId: e.source ? (accountMap.get(String(e.source).trim()) ?? null) : null,
          categoryId,
          date,
        },
      });
      txCount++;
    }

    // ── Transacciones: ingresos (se omiten transferencias internas) ──
    let skippedTransfers = 0;
    for (const i of w.incomes ?? []) {
      if (i.isTransfer) {
        skippedTransfers++;
        continue;
      }
      const amount = toNum(i.amt);
      if (amount <= 0) continue;
      const date = parseLegacyDate(i.date) ?? new Date();
      await prisma.transaction.create({
        data: {
          walletId,
          type: "INCOME",
          amount: new Prisma.Decimal(amount),
          note: i.desc?.slice(0, 200) ?? null,
          accountId: i.source ? (accountMap.get(String(i.source).trim()) ?? null) : null,
          categoryId: await ensureCategory("Salario", "INCOME"),
          date,
        },
      });
      txCount++;
    }

    // ── Deudas ──
    for (const d of w.debts ?? []) {
      const total = toNum(d.amount);
      if (total <= 0) continue;
      await prisma.debt.create({
        data: {
          walletId,
          name: (d.person ?? d.creditor ?? d.name ?? "Deuda").trim().slice(0, 60),
          totalAmount: new Prisma.Decimal(total),
        },
      });
    }

    // ── Suscripciones ──
    for (const s of w.subscriptions ?? []) {
      const amount = toNum(s.amt);
      if (amount <= 0) continue;
      await prisma.subscription.create({
        data: {
          walletId,
          name: (s.name ?? s.servicio ?? "Suscripción").trim().slice(0, 60),
          amount: new Prisma.Decimal(amount),
          billingDay: Math.min(Math.max(Number(s.day) || 1, 1), 31),
        },
      });
    }

    // ── Metas ──
    for (const g of w.goals ?? []) {
      const target = toNum(g.targetAmt);
      if (target <= 0) continue;
      await prisma.goal.create({
        data: {
          walletId,
          name: (g.name ?? "Meta").trim().slice(0, 60),
          targetAmount: new Prisma.Decimal(target),
          savedAmount: new Prisma.Decimal(Math.min(toNum(g.currentAmt), target)),
        },
      });
    }

    // ── Dispositivos autorizados ──
    for (const dev of devicesByWallet.get(uid) ?? []) {
      await prisma.device.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId: dev.id } },
        create: {
          userId: user.id,
          deviceId: dev.id.slice(0, 64),
          status: dev.active ? "ACTIVE" : "PENDING",
        },
        update: {},
      });
    }

    console.log(
      `  ✔ ${email} (${role}): ${accountMap.size} cuentas, ${txCount} movimientos` +
        (skippedTransfers ? `, ${skippedTransfers} transferencias omitidas` : "")
    );
      usersCreated++;
    } catch (userErr) {
      usersFailed++;
      console.error(`  ✖ Error migrando wallet ${uid}:`, userErr instanceof Error ? userErr.message : userErr);
    }
  }

  console.log(`\n✔ Migración completada: ${usersCreated} usuarios creados, ${usersFailed} con error.`);
  if (usersFailed > 0) process.exitCode = 1;
  console.log(
    `⚠ Todos los usuarios migrados tienen la contraseña temporal "${process.env.MIGRATE_TEMP_PASSWORD ?? "Cambio123*"}" y deben cambiarla en el primer login.`
  );
}

main()
  .catch((err) => {
    console.error("✖ Error en la migración:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
