/**
 * Purga manual de datos antiguos (audit_logs, tokens de reset vencidos/usados
 * y devices inactivos). Ejecutable a mano o como cron:
 *
 *   npx tsx scripts/cleanup.ts
 *
 * Lee las mismas variables que la purga automática:
 *   AUDIT_RETENTION_DAYS  (por defecto 365)
 *   DEVICE_INACTIVE_DAYS  (por defecto 180)
 */
import { runDataCleanup } from "../src/lib/cleanup";

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en el entorno.");
    process.exit(1);
  }

  const report = await runDataCleanup({
    auditRetentionDays: intEnv("AUDIT_RETENTION_DAYS", 365),
    deviceInactiveDays: intEnv("DEVICE_INACTIVE_DAYS", 180),
  });

  console.log(`Purga completada: audit_logs=${report.auditLogsDeleted} ` +
    `tokens=${report.expiredTokensDeleted} devices=${report.devicesDeleted}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});