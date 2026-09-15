"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/client-api";
import { getDeviceId } from "@/lib/device";
import { Button, Input, Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ deviceStatus: string }>("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        deviceId: getDeviceId(),
      });
      if (res.deviceStatus === "PENDING") {
        router.push("/dashboard");
        return;
      }
      // Solo rutas internas; evita open redirect (//evil.com, https://…)
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "No se pudo iniciar sesión";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Bienvenido</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ingresa con tu email y contraseña
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

        <div>
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading && <Loader2 className="size-4 animate-spin" />}
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </>
  );
}
