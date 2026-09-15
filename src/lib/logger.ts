/**
 * Structured JSON logger para FINANZASPRO.
 *
 * Formato consistente que Railway y cualquier log aggregator pueden parsear:
 *   { "level": "error", "ts": "...", "ctx": "api", "msg": "...", "err": "..." }
 *
 * Niveles: debug < info < warn < error
 * En producción solo se emiten info y superiores.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: Level =
  process.env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: Level, ctx: string, msg: string, extra?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const entry: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    ctx,
    msg,
  };

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) entry[k] = v;
    }
  }

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

/**
 * Crea un logger con un contexto fijo (nombre del módulo/ruta).
 *
 * @example
 * const log = logger("api:wallet");
 * log.error("Error al obtener wallet", { userId, err });
 */
export function logger(ctx: string) {
  return {
    debug: (msg: string, extra?: Record<string, unknown>) =>
      emit("debug", ctx, msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) =>
      emit("info", ctx, msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) =>
      emit("warn", ctx, msg, extra),
    error: (msg: string, extra?: Record<string, unknown>) =>
      emit("error", ctx, msg, extra),
  };
}

/**
 * Registra un error de forma estructurada con stack trace.
 * Útil para catch blocks donde el error es una instancia de Error.
 */
export function logError(ctx: string, msg: string, err: unknown) {
  const extra: Record<string, unknown> = {};
  if (err instanceof Error) {
    extra.err = err.message;
    extra.stack = err.stack;
    if ("code" in err) extra.code = (err as { code: string }).code;
  } else {
    extra.err = String(err);
  }
  emit("error", ctx, msg, extra);
}
