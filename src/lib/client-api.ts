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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // respuesta vacía
  }

  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: string } } | null)?.error;
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
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Fetcher tipado para usar con useSWR(key, fetcher). */
export const fetcher = <T>(url: string): Promise<T> => request<T>(url);
