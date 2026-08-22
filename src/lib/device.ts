"use client";

/**
 * Identificador estable del dispositivo en localStorage.
 * Se genera una sola vez por navegador y viaja al backend en el login.
 */
const STORAGE_KEY = "fp_device_id_v4";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function generateDeviceId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase();
}
