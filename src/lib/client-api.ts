"use client";

/** Cliente fetch tipado para la API interna. */

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)fp_csrf=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

/** Refresca el CSRF token haciendo un GET (el middleware regenera la cookie). */
async function refreshCsrfToken(): Promise<string> {
  try {
    const res = await fetch("/api/csrf", { credentials: "include" });
    const data = (await res.json()) as { csrfToken?: string };
    return data?.csrfToken ?? "";
  } catch {
    return "";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const needsCsrf = method === "POST" || method === "PATCH" || method === "DELETE";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (needsCsrf) {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // respuesta vacía
  }

  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: string } } | null)?.error;

    // Reintentar una vez si es error CSRF (token stale o cookie no enviada)
    if (res.status === 403 && err?.code === "CSRF_INVALID") {
      const newToken = await refreshCsrfToken();
      if (newToken) {
        // Reintentar con el token nuevo directamente (sin depender de la cookie)
        const retryHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string> ?? {}),
          "X-CSRF-Token": newToken,
        };
        const retryRes = await fetch(path, {
          ...init,
          credentials: "include",
          headers: retryHeaders,
        });
        let retryBody: unknown = null;
        try { retryBody = await retryRes.json(); } catch { /* empty */ }
        if (!retryRes.ok) {
          const retryErr = (retryBody as { error?: { message?: string; code?: string } } | null)?.error;
          throw new ApiClientError(retryRes.status, retryErr?.message ?? `Error ${retryRes.status}`, retryErr?.code);
        }
        return retryBody as T;
      }
    }

    throw new ApiClientError(res.status, err?.message ?? `Error ${res.status}`, err?.code);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),
};

/** Fetcher tipado para usar con useSWR(key, fetcher). */
export const fetcher = <T>(url: string): Promise<T> => request<T>(url);
