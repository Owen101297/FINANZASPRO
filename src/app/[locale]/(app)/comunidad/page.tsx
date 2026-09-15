"use client";

import { Suspense } from "react";
import useSWR from "swr";
import { Loader2, ShieldCheck } from "lucide-react";
import { fetcher } from "@/lib/client-api";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

type AdminAccount = {
  id: string;
  name: string;
  color: string | null;
};

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  accounts: AdminAccount[];
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ComunidadPage />
    </Suspense>
  );
}

function ComunidadPage() {
  const t = useTranslations("comunidad");
  const { data, isLoading, error } = useSWR<{ admins: AdminUser[] }>(
    "/api/community/admins",
    fetcher
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <EmptyState title={t("loadError")} hint={t("loadErrorHint")} />
        </Card>
      ) : !data?.admins.length ? (
        <Card>
          <EmptyState title={t("empty")} hint={t("emptyHint")} />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.admins.map((admin) => (
            <Card key={admin.id} className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {admin.name ?? admin.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {admin.email}
                  </p>
                </div>
              </div>

              {admin.accounts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("accounts")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {admin.accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium"
                      >
                        {acc.color && (
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: acc.color }}
                          />
                        )}
                        {acc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
