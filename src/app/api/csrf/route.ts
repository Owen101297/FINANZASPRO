import { NextResponse } from "next/server";
import { CSRF_COOKIE, generateCsrfToken } from "@/lib/csrf";
import { csrfCookieOptions } from "@/lib/auth";

/**
 * Endpoint para refrescar el token CSRF.
 * El cliente lo llama cuando recibe 403 CSRF para obtener un token nuevo.
 * El middleware ya validó que es un GET (exento de CSRF) y regenera la cookie.
 */
export async function GET() {
  const token = generateCsrfToken();
  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set(CSRF_COOKIE, token, csrfCookieOptions());
  return res;
}
