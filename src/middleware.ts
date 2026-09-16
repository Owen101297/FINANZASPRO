import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { hasLocale } from "next-intl";
import { routing } from "@/routing";
import { validateCsrf, CSRF_COOKIE, generateCsrfToken } from "@/lib/csrf";
import { csrfCookieOptions } from "@/lib/auth";

/**
 * Rutas de página protegidas (requieren sesión válida).
 * Estas rutas están SIN el prefijo [locale] — el middleware las
 * matchea después de detectar/normalizar el locale.
 */
const PROTECTED_PATHS = [
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

const AUTH_PATHS = ["/login", "/registro"];

const IS_DEV = process.env.NODE_ENV === "development";

/** Cabeceras de seguridad aplicadas a todas las respuestas. */
function securityDirectives(nonce: string): Record<string, string> {
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${IS_DEV ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self' https://static.cloudflareinsights.com;
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
    "X-XSS-Protection": "0",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
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

/**
 * Extrae el pathname "interno" (sin el segmento de locale) para poder
 * comparar contra PROTECTED_PATHS y AUTH_PATHS.
 *
 * /es/dashboard → /dashboard
 * /en/login    → /login
 * /dashboard   → /dashboard  (sin locale, fallback)
 */
function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  // Si el segundo segmento es un locale conocido, lo eliminamos
  if (segments.length > 1 && hasLocale(routing.locales, segments[1])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas API y estáticas: solo cabeceras de seguridad, sin locale ni auth
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const isStatic = pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/manifest.webmanifest" || pathname === "/sw.js" || pathname.endsWith(".js") || pathname.startsWith("/icons/");

  if (isApi || isStatic) {
    if (isApi && !validateCsrf(req)) {
      return NextResponse.json(
        { error: { message: "CSRF token inválido", code: "CSRF_INVALID" } },
        { status: 403 }
      );
    }
    const nonce = crypto.randomUUID();
    const directives = securityDirectives(nonce);
    const headers = new Headers(req.headers);
    headers.set("x-nonce", nonce);
    const res = withSecurityHeaders(
      NextResponse.next({ request: { headers } }),
      directives
    );
    // Regenerar CSRF token en cada respuesta API para evitar tokens stale
    if (isApi) {
      res.cookies.set(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions());
    }
    return res;
  }

  // --- Locale detection ---
  const pathnameLocale = (() => {
    const segments = pathname.split("/");
    if (segments.length > 1 && hasLocale(routing.locales, segments[1])) {
      return segments[1];
    }
    return undefined;
  })();

  // Si no hay locale en la URL, redirigir al default locale
  if (!pathnameLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname}`;
    return withSecurityHeaders(NextResponse.redirect(url), securityDirectives(crypto.randomUUID()));
  }

  // Si el locale no es válido, redirigir al default
  if (!hasLocale(routing.locales, pathnameLocale)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${stripLocale(pathname)}`;
    return withSecurityHeaders(NextResponse.redirect(url), securityDirectives(crypto.randomUUID()));
  }

  // --- Auth checks (solo en páginas) ---
  const internalPath = stripLocale(pathname);
  const valid = await isTokenValid(req.cookies.get("fp_session")?.value);

  const isProtected = PROTECTED_PATHS.some(
    (p) => internalPath === p || internalPath.startsWith(`${p}/`)
  );
  const isAuthPage = AUTH_PATHS.includes(internalPath);

  if (isProtected && !valid) {
    const url = new URL(`/${pathnameLocale}/login`, req.url);
    url.searchParams.set("next", internalPath);
    return withSecurityHeaders(NextResponse.redirect(url), securityDirectives(crypto.randomUUID()));
  }

  if (isAuthPage && valid) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL(`/${pathnameLocale}/dashboard`, req.url)),
      securityDirectives(crypto.randomUUID())
    );
  }

  // --- Security headers ---
  const nonce = crypto.randomUUID();
  const directives = securityDirectives(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    directives
  );
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
