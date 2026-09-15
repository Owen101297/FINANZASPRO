import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/primitives";

/**
 * 404 personalizado. Se renderiza cuando Next.js no encuentra la ruta
 * solicitada (GET /cualquier-cosa-inexistente devuelve esta página).
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{t("title")}</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("message")}
        </p>
        <Link href="/dashboard">
          <Button className="mt-2">{t("backHome")}</Button>
        </Link>
      </div>
    </div>
  );
}