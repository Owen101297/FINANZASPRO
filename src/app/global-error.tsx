"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Global error boundary. Catches errors in the root layout (<html>/<body>).
 * Must include its own <html> and <body> tags since the root layout is broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#f7f8fa] px-5 font-sans text-[#1a1a2e]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="size-7 text-red-600" />
          </div>
          <h1 className="text-lg font-bold">Error crítico</h1>
          <p className="max-w-xs text-sm text-gray-500">
            La aplicación encontró un error inesperado. Recarga la página para continuar.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-gray-400">{error.digest}</p>
          )}
          <button
            onClick={reset}
            className="mt-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#7c3aed]"
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
