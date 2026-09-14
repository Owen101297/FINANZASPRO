/**
 * Rate limiting en memoria (una réplica). Suficiente para el despliegue actual
 * de Railway; si se escala a varias instancias conviene moverlo a Redis.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const MAX_BUCKETS = 10_000;
let lastCleanup = Date.now();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const expired = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= expired) buckets.delete(key);
  }
  if (buckets.size > MAX_BUCKETS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Limita solicitudes por clave (p. ej. IP+email). La primera llamada consume 1;
 * al superar `max` dentro de `windowMs` devuelve allowed=false.
 */
export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true };
}

/** IP del cliente desde los encabezados que pone el proxy (Railway). */
export function clientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}