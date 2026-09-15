"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  const locale = useLocale();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Página no encontrada</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          La ruta que buscas no existe o fue movida.
        </p>
        <Link href={`/${locale}/dashboard`}>
          <Button className="mt-2">Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
