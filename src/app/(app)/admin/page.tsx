"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Loader2,
  ShieldCheck,
  Check,
  Ban,
  Trash2,
  Hourglass,
  ScrollText,
  Users as UsersIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { api, fetcher } from "@/lib/client-api";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Avatar } from "@/components/app-shell";
import { Badge, Card, EmptyState, Modal } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";

type Tab = "devices" | "users" | "audit";

interface DeviceRow {
  id: string;
  deviceId: string;
  label: string | null;
  status: "PENDING" | "ACTIVE" | "BLOCKED";
  lastSeenAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null; role: string };
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  deviceCount: number;
  salary: number;
  createdAt: string;
}

interface AuditRow {
  id: string;
  action: string;
  createdAt: string;
  actorEmail: string | null;
  meta: Record<string, unknown> | null;
}

const statusBadge = {
  PENDING: { tone: "warning" as const, label: "pendiente" },
  ACTIVE: { tone: "positive" as const, label: "activo" },
  BLOCKED: { tone: "negative" as const, label: "bloqueado" },
};

export default function AdminPage() {
  const toast = useToast();
  const { user: sessionUser } = useSession();
  const [tab, setTab] = useState<Tab>("devices");
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const devices = useSWR<{ devices: DeviceRow[] }>("/api/admin/devices", fetcher);
  const users = useSWR<{ users: UserRow[] }>("/api/admin/users", fetcher);
  const audit = useSWR<{ logs: AuditRow[] }>("/api/admin/audit", fetcher);

  async function setDeviceStatus(device: DeviceRow, status: DeviceRow["status"]) {
    try {
      await api.patch("/api/admin/devices", { deviceId: device.id, status });
      toast(
        status === "ACTIVE"
          ? `Dispositivo de ${device.user.email} aprobado`
          : status === "BLOCKED"
            ? "Dispositivo bloqueado"
            : "Dispositivo en espera",
        "success"
      );
      devices.mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  async function deleteDevice(device: DeviceRow) {
    const ok = await confirm("Eliminar dispositivo", `¿Eliminar el dispositivo "${device.deviceId}"?`);
    if (!ok) return;
    try {
      await api.delete(`/api/admin/devices?deviceId=${device.id}`);
      toast("Dispositivo eliminado", "success");
      devices.mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  async function changeRole(user: UserRow, role: UserRow["role"]) {
    try {
      await api.patch("/api/admin/users", { userId: user.id, role });
      toast(`Rol de ${user.email} actualizado`, "success");
      users.mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    }
  }

  async function deleteUser() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/admin/users?userId=${confirmDelete.id}`);
      toast("Usuario eliminado con todos sus datos", "success");
      setConfirmDelete(null);
      users.mutate();
      devices.mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount =
    devices.data?.devices.filter((d) => d.status === "PENDING").length ?? 0;

  return (
    <>
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Administración</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Usuarios, dispositivos y auditoría
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["devices", "Dispositivos", pendingCount],
            ["users", "Usuarios"],
            ["audit", "Auditoría"],
          ] as Array<[Tab, string, number?]>
        ).map(([key, label, badge]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "relative rounded-lg py-2.5 text-xs font-bold uppercase tracking-wide transition-colors",
              tab === key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {badge ? (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-warning text-[9px] font-extrabold text-black">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "devices" && <DevicesTab {...devices} onStatus={setDeviceStatus} onDelete={deleteDevice} />}
      {tab === "users" && (
        <UsersTab
          {...users}
          mySession={sessionUser}
          onRole={changeRole}
          onAskDelete={setConfirmDelete}
        />
      )}
      {tab === "audit" && <AuditTab {...audit} />}

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Eliminar usuario">
        <p className="text-sm leading-relaxed text-muted-foreground">
          ¿Eliminar a <strong className="text-foreground">{confirmDelete?.email}</strong>? Se borrarán
          permanentemente su wallet, movimientos, cuentas y dispositivos.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setConfirmDelete(null)}
            disabled={busy}
            className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={deleteUser}
            disabled={busy}
            className="flex-[2] rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="mr-1.5 inline size-4 animate-spin" />}
            Eliminar definitivamente
          </button>
        </div>
      </Modal>
    </div>
    {ConfirmDialog}
    </>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-14">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function DevicesTab({
  data,
  isLoading,
  onStatus,
  onDelete,
}: {
  data?: { devices: DeviceRow[] };
  isLoading: boolean;
  onStatus: (d: DeviceRow, s: DeviceRow["status"]) => Promise<void>;
  onDelete: (d: DeviceRow) => Promise<void>;
}) {
  if (isLoading) return <Loading />;
  const list = [...(data?.devices ?? [])].sort((a, b) => {
    const order = { PENDING: 0, ACTIVE: 1, BLOCKED: 2 } as const;
    return order[a.status] - order[b.status];
  });

  if (list.length === 0)
    return (
      <Card>
        <EmptyState icon={<Hourglass className="size-5" />} title="Sin dispositivos registrados" />
      </Card>
    );

  return (
    <div className="space-y-2.5">
      {list.map((device) => {
        const badge = statusBadge[device.status];
        return (
          <Card key={device.id} className="py-4">
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  device.status === "PENDING"
                    ? "bg-warning/15 text-warning"
                    : device.status === "ACTIVE"
                      ? "bg-positive/15 text-positive"
                      : "bg-destructive/15 text-destructive"
                )}
              >
                {device.status === "PENDING" ? (
                  <Hourglass className="size-4" />
                ) : device.status === "ACTIVE" ? (
                  <Check className="size-4" />
                ) : (
                  <Ban className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{device.user.name ?? device.user.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {device.user.email} · ID {device.deviceId.slice(0, 8)}…
                </p>
              </div>
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>

            {device.status !== "ACTIVE" && (
              <button
                onClick={() => void onStatus(device, "ACTIVE")}
                className="mt-3 w-full rounded-xl bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
              >
                Aprobar acceso
              </button>
            )}
            <div className="mt-2 flex gap-2">
              {device.status === "ACTIVE" && (
                <button
                  onClick={() => void onStatus(device, "BLOCKED")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Ban className="size-3.5" /> Bloquear
                </button>
              )}
              <button
                onClick={() => void onDelete(device)}
                aria-label={`Eliminar dispositivo ${device.deviceId}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function UsersTab({
  data,
  isLoading,
  mySession,
  onRole,
  onAskDelete,
}: {
  data?: { users: UserRow[] };
  isLoading: boolean;
  mySession: { id: string } | null;
  onRole: (u: UserRow, r: UserRow["role"]) => Promise<void>;
  onAskDelete: (u: UserRow) => void;
}) {
  if (isLoading) return <Loading />;
  const list = data?.users ?? [];

  if (list.length === 0)
    return (
      <Card>
        <EmptyState icon={<UsersIcon className="size-5" />} title="Sin usuarios" />
      </Card>
    );

  return (
    <div className="space-y-2.5">
      {list.map((user) => {
        const isMe = user.id === mySession?.id;
        return (
          <Card key={user.id} className="py-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.name ?? user.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {user.name ?? "Sin nombre"}
                  {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email} · {user.deviceCount} dispositivo{user.deviceCount === 1 ? "" : "s"}
                  {user.salary > 0 && ` · ${formatCurrency(user.salary)}`}
                </p>
              </div>
              {user.role === "ADMIN" && <Badge tone="accent">admin</Badge>}
            </div>

            {!isMe && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void onRole(user, user.role === "ADMIN" ? "USER" : "ADMIN")}
                  className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                >
                  {user.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                </button>
                <button
                  onClick={() => onAskDelete(user)}
                  aria-label={`Eliminar usuario ${user.email}`}
                  className="flex items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function AuditTab({ data, isLoading }: { data?: { logs: AuditRow[] }; isLoading: boolean }) {
  if (isLoading) return <Loading />;
  const logs = data?.logs ?? [];

  if (logs.length === 0)
    return (
      <Card>
        <EmptyState icon={<ScrollText className="size-5" />} title="Sin eventos registrados" />
      </Card>
    );

  return (
    <Card className="divide-y divide-border p-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 px-2 py-2.5">
          <ScrollText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">{log.action.replaceAll("_", " ")}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {log.actorEmail ?? "sistema"} ·{" "}
              {new Date(log.createdAt).toLocaleString("es-EC", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}
