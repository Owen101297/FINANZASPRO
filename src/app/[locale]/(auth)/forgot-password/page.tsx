"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/client-api";
import { Button, Input, Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      toast(
        err instanceof ApiClientError ? err.message : t("error"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <div className="mb-8 flex flex-col items-center text-center">
          <CheckCircle2 className="mb-3 size-10 text-emerald-500" />
          <h1 className="text-2xl font-extrabold tracking-tight">{t("checkEmail")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("emailSent")}
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-primary hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}