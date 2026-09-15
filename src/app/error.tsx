"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/**
 * Next.js App Router error boundary. Captura errores de renderizado del
 * servidor y del cliente en cualquier segmento de la app. El componente
 * `reset` vuelve a intentar renderizar el último segmento exitoso.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-page]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Algo salió mal</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Ocurrió un error inesperado. Intenta de nuevo; si el problema persiste,
          contacta al administrador.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/70">
            {error.digest}
          </p>
        )}
        <Button onClick={reset} className="mt-2">
          Reintentar
        </Button>
      </div>
    </div>
  );
}