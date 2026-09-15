import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getLocale } from "next-intl/server";

export default async function Home() {
  const session = await getSessionFromCookies();
  const locale = await getLocale();
  redirect(session ? `/${locale}/dashboard` : `/${locale}/login`);
}
