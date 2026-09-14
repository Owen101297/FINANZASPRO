"use client";

import useSWR from "swr";
import { api } from "@/lib/client-api";
import { useCallback } from "react";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  /** true = usa contraseña temporal y debe cambiarla */
  passwordReset?: boolean;
}

export type DeviceStatus = "PENDING" | "ACTIVE" | "BLOCKED";

interface SessionResponse {
  user: SessionUser | null;
  deviceStatus: DeviceStatus | null;
}

const fetcher = (url: string) => api.get<SessionResponse>(url);

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/session", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Offline o error momentáneo: la cookie expira sola, aún así se navega al login.
    }
    mutate({ user: null, deviceStatus: null }, { revalidate: false });
    window.location.href = "/login";
  }, [mutate]);

  return {
    user: data?.user ?? null,
    deviceStatus: data?.deviceStatus ?? null,
    isLoading,
    isError: Boolean(error),
    refresh: mutate,
    logout,
  };
}
