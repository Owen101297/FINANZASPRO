import { runDataCleanup } from "@/lib/cleanup";
import { logError } from "@/lib/logger";

const CLEANUP_INTERVAL_SECONDS = 21_600; // 6 h por defecto
const CLEANUP_MIN_INTERVAL_SECONDS = 3_600; // 1 h como mínimo

/**
 * Purga periódica del servidor: solo se activa en producción con
 * AUTO_CLEANUP="true" (ver .env.example y variables de Railway). Corre la misma
 * rutina que POST /api/admin/data-cleanup para que la bitácora, los tokens de
 * reset vencidos/usados y los devices inactivos no crezcan sin límite.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AUTO_CLEANUP !== "true") return;

  const parsed = Number(process.env.CLEANUP_INTERVAL_SECONDS);
  const intervalSeconds =
    Number.isFinite(parsed) && parsed >= CLEANUP_MIN_INTERVAL_SECONDS
      ? parsed
      : CLEANUP_INTERVAL_SECONDS;

  const timer = setInterval(() => {
    runDataCleanup().catch((err) => {
      logError("cleanup", "Error en la purga periódica", err);
    });
  }, intervalSeconds * 1000);

  timer.unref?.();
}