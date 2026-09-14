"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/client-api";
import { Button, Input, Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      await api.post("/api/auth/register", {
        name: name.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
      });
      toast("Cuenta creada. Ahora inicia sesión.", "success");
      router.push("/login");
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "No se pudo crear la cuenta";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Crea tu cuenta</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          El primer usuario registrado será administrador
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre (opcional)</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className="pl-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repite tu contraseña"
              className="pl-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
