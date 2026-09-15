import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getLocale } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  const locale = await getLocale();
  if (session) redirect(`/${locale}/dashboard`);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-3xl"
      />
      <main className="relative z-10 w-full max-w-sm animate-fade-in">{children}</main>
    </div>
  );
}
