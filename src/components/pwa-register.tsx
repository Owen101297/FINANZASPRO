"use client";

import { useEffect } from "react";

/**
 * Registra el service worker para soporte PWA.
 * Se monta en el root layout para que el SW exista en / y en /login
 * (la página de entrada), no solo dentro de las rutas de la app.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
