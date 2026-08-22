"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { api, ApiClientError } from "@/lib/client-api";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/components/ui/toast";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
} from "@/components/ui/primitives";

export default function CuentaPage() {
  const { user, logout, refresh } = useSession();
  const toast = useToast();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Las contraseñas nuevas no coinciden", "error");
      return;
    }
    if (newPassword.length < 8) {
      toast("La nueva contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast("Contraseña actualizada", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      refresh();
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "No se pudo cambiar la contraseña";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Mi cuenta" subtitle="Tu perfil y seguridad" />

      <Card className="mb-5">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <KeyRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user?.name ?? "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          {user?.role === "ADMIN" && <Badge tone="accent">admin</Badge>}
        </div>
        {user?.passwordReset && (
          <p className="mt-4 rounded-xl bg-warning/10 px-4 py-2.5 text-xs font-medium text-warning">
            Estás usando una contraseña temporal. Cámbiala a continuación para asegurar tu cuenta.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Cambiar contraseña
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="cur-pass">Contraseña actual</Label>
            <Input
              id="cur-pass"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-pass">Nueva contraseña</Label>
              <Input
                id="new-pass"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="conf-pass">Confirmar nueva</Label>
              <Input
                id="conf-pass"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar contraseña
          </Button>
        </form>
      </Card>

      <Card className="mt-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Sesión
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Cierra sesión en este dispositivo. Otros dispositivos autorizados seguirán activos.
        </p>
        <Button variant="outline" onClick={() => void logout()}>
          <LogOut className="size-4" /> Cerrar sesión
        </Button>
      </Card>
    </div>
  );
}
