/**
 * Skeleton de carga global. Se muestra mientras Next.js resuelve la página
 * (por ejemplo, al navegar entre secciones de la app). Es un skeleton simple
 * que no depende de JavaScript del cliente.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-xs text-muted-foreground">Cargando…</span>
      </div>
    </div>
  );
}