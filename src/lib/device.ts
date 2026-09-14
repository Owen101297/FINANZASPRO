"use client";

/**
 * Identificador estable del dispositivo en localStorage.
 * Se genera una sola vez por navegador y viaja al backend en el login.
 */
const STORAGE_KEY = "fp_device_id_v4";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage/crypto no disponibles (modo privado estricto, HTTP): se genera
    // un id por sesión, el backend lo registra como dispositivo nuevo.
    return generateDeviceId();
  }
}

function generateDeviceId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase();
    }
  } catch {
    // fallback a Math.random
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
