import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "fp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type SessionRole = "USER" | "ADMIN";

export interface SessionPayload {
  sub: string;
  role: SessionRole;
  /** deviceId del cliente que inició sesión */
  did: string;
}

/** Valores de ejemplo/placeholder que jamás deben usarse en producción. */
const FORBIDDEN_SECRETS = new Set(["cambia-esto-por-un-secreto-largo", "changeme", "secret", "your-secret", "auth_secret", "clave-secreta"]);

function getSecretKey(): Uint8Array {
  const secret = (process.env.AUTH_SECRET ?? "").trim();
  const normalized = secret.toLowerCase();
  const isPlaceholder =
    !secret ||
    secret.length < 16 ||
    FORBIDDEN_SECRETS.has(normalized) ||
    normalized.startsWith("cambia-esto") ||
    normalized.startsWith("changeme") ||
    normalized.includes("secret-placeholder");
  if (isPlaceholder) {
    throw new Error(
      "AUTH_SECRET no está configurado correctamente: usa un valor aleatorio de al menos 32 caracteres (node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\")"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, did: payload.did })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || typeof payload.did !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
      did: payload.did,
    };
  } catch {
    return null;
  }
}

/** Lee y verifica la sesión desde la cookie en Server Components / Route Handlers. */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
