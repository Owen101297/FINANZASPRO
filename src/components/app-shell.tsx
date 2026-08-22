"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Tags,
  CalendarClock,
  Landmark,
  Repeat,
  Target,
  ChartPie,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Hourglass,
  Ban,
  Loader2,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useTheme } from "@/components/theme-provider";
import { Button, EmptyState } from "@/components/ui/primitives";
import { PwaRegister } from "@/components/pwa-register";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: <LayoutDashboard className="size-5" /> },
  { href: "/transacciones", label: "Movimientos", icon: <Receipt className="size-5" /> },
  { href: "/cuentas", label: "Cuentas", icon: <Wallet className="size-5" /> },
  { href: "/categorias", label: "Categorías", icon: <Tags className="size-5" /> },
  { href: "/ciclo", label: "Ciclo", icon: <CalendarClock className="size-5" /> },
  { href: "/deudas", label: "Deudas", icon: <Landmark className="size-5" /> },
  { href: "/suscripciones", label: "Suscripciones", icon: <Repeat className="size-5" /> },
  { href: "/metas", label: "Metas", icon: <Target className="size-5" /> },
  { href: "/analisis", label: "Análisis", icon: <ChartPie className="size-5" /> },
];

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: <ShieldCheck className="size-5" />,
};

const MOBILE_DOCK_BASE: NavItem[] = [
  NAV_ITEMS[0] as NavItem,
  NAV_ITEMS[1] as NavItem,
  NAV_ITEMS[8] as NavItem,
  NAV_ITEMS[7] as NavItem,
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, deviceStatus, isLoading, logout } = useSession();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <EmptyState
          title="Sesión no encontrada"
          hint="Vuelve a iniciar sesión para continuar."
        />
        <Link href="/login" className="sr-only">
          Ir al login
        </Link>
      </div>
    );
  }

  if (deviceStatus === "PENDING") return <DevicePendingScreen logout={logout} />;
  if (deviceStatus === "BLOCKED") return <DeviceBlockedScreen logout={logout} />;

  const navItems =
    user.role === "ADMIN" ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  const dockItems =
    user.role === "ADMIN"
      ? [(MOBILE_DOCK_BASE[0] as NavItem), (MOBILE_DOCK_BASE[1] as NavItem), ADMIN_NAV_ITEM]
      : MOBILE_DOCK_BASE;

  return (
    <div className="min-h-dvh bg-background">
      <PwaRegister />

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>
        <SessionFooter user={user} onLogout={logout} />
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand compact />
        <ThemeToggle />
      </header>

      {/* Contenido */}
      <main className="px-4 pb-28 pt-5 md:pl-64 md:pr-8 md:pb-10 lg:px-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      {/* Dock móvil */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-border bg-card/95 px-2 py-1.5 shadow-xl shadow-black/20 backdrop-blur safe-bottom md:hidden"
      >
        {dockItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={logout}
          aria-label="Cerrar sesión"
          className="flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="size-5" />
          Salir
        </button>
      </nav>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
        <Wallet className="size-5 text-primary" />
      </div>
      {!compact && (
        <span className="text-base font-extrabold tracking-tight">FinanzasPro</span>
      )}
      {compact && <span className="text-sm font-extrabold">FinanzasPro</span>}
    </Link>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function SessionFooter({
  user,
  onLogout,
}: {
  user: { name: string | null; email: string; role: string };
  onLogout: () => void;
}) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex items-center gap-3 px-2">
        <Avatar name={user.name ?? user.email} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name ?? "Usuario"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-2">
        <ThemeToggle />
        <Button variant="ghost" onClick={onLogout} className="flex-1 justify-start px-3 text-xs">
          <LogOut className="size-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent ring-1 ring-accent/25">
      {initials || "?"}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Cambiar tema" className="px-2.5">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function DevicePendingScreen({ logout }: { logout: () => void }) {
  return (
    <GateScreen
      icon={<Hourglass className="size-7 text-warning" />}
      title="Dispositivo pendiente de aprobación"
      message="Un administrador debe autorizar este dispositivo antes de que puedas acceder a tus finanzas. Recibirás acceso en cuanto sea aprobado."
      onLogout={logout}
    />
  );
}

function DeviceBlockedScreen({ logout }: { logout: () => void }) {
  return (
    <GateScreen
      icon={<Ban className="size-7 text-destructive" />}
      title="Dispositivo bloqueado"
      message="Este dispositivo fue bloqueado por un administrador. Si crees que es un error, contacta al administrador de tu cuenta."
      onLogout={logout}
    />
  );
}

function GateScreen({
  icon,
  title,
  message,
  onLogout,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-scale-in rounded-card border border-border bg-card p-8 text-center shadow-xl shadow-black/5">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          {icon}
        </div>
        <h1 className="mb-2 text-lg font-bold">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onLogout} className="w-full">
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
