import { prisma } from "@/lib/prisma";

export interface CleanupOptions {
  /** Antigüedad máxima de audit_logs en días (por defecto 365). */
  auditRetentionDays: number;
  /** Antigüedad máxima sin actividad de un device en días (por defecto 180). */
  deviceInactiveDays: number;
}

export interface CleanupReport {
  auditLogsDeleted: number;
  expiredTokensDeleted: number;
  devicesDeleted: number;
}

export const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
  auditRetentionDays: 365,
  deviceInactiveDays: 180,
};

/**
 * Purga datos que ya no sirven para conservar los registros acotados:
 *
 * - audit_logs más antiguos que `auditRetentionDays` (la bitácora no se consulta
 *   hacia atrás más allá de eso y no debe crecer sin límite).
 * - password_reset_tokens ya usados o vencidos (un solo uso, TTL 60 min).
 * - devices sin actividad en `deviceInactiveDays` (última sesión o nunca vistos
 *   y creados hace más de ese tiempo). Nunca borra el device del admin que está
 *   operando: cada request actualiza su lastSeenAt.
 */
export async function runDataCleanup(
  opts: Partial<CleanupOptions> = {}
): Promise<CleanupReport> {
  const { auditRetentionDays, deviceInactiveDays } = {
    ...DEFAULT_CLEANUP_OPTIONS,
    ...opts,
  };
  const now = new Date();
  const auditCutoff = new Date(now.getTime() - auditRetentionDays * 86_400_000);
  const deviceCutoff = new Date(now.getTime() - deviceInactiveDays * 86_400_000);

  const [auditLogs, expiredTokens, devices] = await Promise.all([
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }],
      },
    }),
    prisma.device.deleteMany({
      where: {
        OR: [
          { lastSeenAt: { lt: deviceCutoff } },
          { lastSeenAt: null, createdAt: { lt: deviceCutoff } },
        ],
      },
    }),
  ]);

  return {
    auditLogsDeleted: auditLogs.count,
    expiredTokensDeleted: expiredTokens.count,
    devicesDeleted: devices.count,
  };
}