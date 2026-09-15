import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

export const CSRF_COOKIE = "fp_csrf";
export const CSRF_HEADER = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/** Genera un token CSRF aleatorio seguro. */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/** Cookies que NO requieren CSRF (auth flows públicos). */
const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/csp-report",
]);

/** Métodos que requieren validación CSRF. */
const CSRF_METHODS = new Set(["POST", "PATCH", "DELETE"]);

/**
 * Valida que la petición tenga un token CSRF válido.
 * Usa Double Submit Cookie pattern: compara el header con la cookie.
 */
export function validateCsrf(req: NextRequest): boolean {
  const method = req.method;
  if (!CSRF_METHODS.has(method)) return true;

  const pathname = req.nextUrl.pathname;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    if (CSRF_EXEMPT_PATHS.has(pathname)) return true;
  } else {
    return true;
  }

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}
