"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/client-api";
import { Button, Input, Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}

function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, newPassword: password });
      setDone(true);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "No se pudo restablecer la contraseña";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Enlace inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El enlace de recuperación no es válido. Solicita uno nuevo.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 block text-sm font-semibold text-primary hover:underline"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mb-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
        <h1 className="text-2xl font-extrabold tracking-tight">Contraseña actualizada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Nueva contraseña</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Define tu nueva contraseña de acceso
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="confirm-password">Confirmar contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="pl-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading && <Loader2 className="size-4 animate-spin" />}
          Guardar contraseña
        </Button>
      </form>
    </>
  );
}