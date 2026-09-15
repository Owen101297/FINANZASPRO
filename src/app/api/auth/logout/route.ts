import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, csrfCookieOptions } from "@/lib/auth";
import { CSRF_COOKIE } from "@/lib/csrf";

const DEVICE_COOKIE = "fp_device";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  const cookieOpts = sessionCookieOptions();
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOpts,
    maxAge: 0,
  });
  response.cookies.set(CSRF_COOKIE, "", {
    ...csrfCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(DEVICE_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
