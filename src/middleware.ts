import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/** Rutas de página protegidas (requieren sesión válida). */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transacciones",
  "/cuentas",
  "/categorias",
  "/ciclo",
  "/deudas",
  "/suscripciones",
  "/metas",
  "/analisis",
  "/admin",
];

const AUTH_PAGES = ["/login", "/registro"];

async function isTokenValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const valid = await isTokenValid(req.cookies.get("fp_session")?.value);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !valid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && valid) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    ...PROTECTED_PREFIXES.map((p) => `${p}/:path*`),
    ...PROTECTED_PREFIXES.map((p) => p),
    "/login",
    "/registro",
  ],
};
