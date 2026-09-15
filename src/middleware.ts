import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

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
  "/cuenta",
];

const AUTH_PAGES = ["/login", "/registro"];

const IS_DEV = process.env.NODE_ENV === "development";

/** Cabeceras de seguridad aplicadas a todas las respuestas (HTML, API y estáticos). */
function securityDirectives(nonce: string): Record<string, string> {
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${IS_DEV ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    worker-src 'self';
    report-uri /api/csp-report;
    report-to csp-endpoint;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    "Content-Security-Policy": csp,
    "Reporting-Endpoints": 'csp-endpoint="/api/csp-report"',
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "geolocation=(), camera=(), microphone=(), payment=(), usb=(), autoplay=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}

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

function withSecurityHeaders(
  res: NextResponse,
  directives: Record<string, string>
): NextResponse {
  for (const [key, value] of Object.entries(directives)) res.headers.set(key, value);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nonce único por request para la CSP estricta. Next.js lo propaga a sus
  // scripts inline leyendo la cabecera x-nonce durante el SSR dinámico.
  const nonce = crypto.randomUUID();
  const directives = securityDirectives(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  // Las rutas API no gatean sesión aquí: la autorización la hacen los route
  // handlers (requireUser/requireAdmin). Solo reciben cabeceras de seguridad.
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  if (!isApi) {
    const valid = await isTokenValid(req.cookies.get("fp_session")?.value);

    const isProtected = PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    const isAuthPage = AUTH_PAGES.includes(pathname);

    if (isProtected && !valid) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(url), directives);
    }

    if (isAuthPage && valid) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", req.url)),
        directives
      );
    }
  }

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    directives
  );
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos y prefetches de next/link:
     * - _next/static y _next/image (chunks/imágenes optimizadas)
     * - favicon.ico y robots.txt
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};