"use client";

import { useState } from "react";
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
  Users,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Hourglass,
  Ban,
  Loader2,
  UserCog,
  KeyRound,
  MoreHorizontal,
  X,
  CreditCard,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useTheme } from "@/components/theme-provider";
import { Button, EmptyState, Input, Label } from "@/components/ui/primitives";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { useTranslations, useLocale } from "next-intl";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "home", icon: <LayoutDashboard className="size-5" /> },
  { href: "/transacciones", label: "transactions", icon: <Receipt className="size-5" /> },
  { href: "/cuentas", label: "accounts", icon: <Wallet className="size-5" /> },
  { href: "/categorias", label: "categories", icon: <Tags className="size-5" /> },
  { href: "/ciclo", label: "cycle", icon: <CalendarClock className="size-5" /> },
  { href: "/deudas", label: "debts", icon: <Landmark className="size-5" /> },
  { href: "/plan-pagos", label: "paymentPlan", icon: <CreditCard className="size-5" /> },
  { href: "/suscripciones", label: "subscriptions", icon: <Repeat className="size-5" /> },
  { href: "/metas", label: "goals", icon: <Target className="size-5" /> },
  { href: "/analisis", label: "analysis", icon: <ChartPie className="size-5" /> },
  { href: "/comunidad", label: "community", icon: <Users className="size-5" /> },
  { href: "/cuenta", label: "myAccount", icon: <UserCog className="size-5" /> },
];

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "admin",
  icon: <ShieldCheck className="size-5" />,
};

const MOBILE_DOCK_BASE: NavItem[] = [
  NAV_ITEMS[0] as NavItem, // Dashboard
  NAV_ITEMS[1] as NavItem, // Transacciones
  NAV_ITEMS[2] as NavItem, // Cuentas
  NAV_ITEMS[3] as NavItem, // Categorías
];

/** Activo solo por segmento exacto ("/cuenta" no marca "/cuentas"). */
function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, deviceStatus, isLoading, logout, refresh } = useSession();
  const locale = useLocale();
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tSession = useTranslations("session");
  const [showMore, setShowMore] = useState(false);

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
          title={tSession("notFound")}
          hint={tSession("notFoundHint")}
        />
        <Link href={`/${locale}/login`} className="sr-only">
          {tNav("goToLogin")}
        </Link>
      </div>
    );
  }

  if (user?.passwordReset) return <PasswordResetScreen refresh={refresh} logout={logout} />;
  if (deviceStatus === "PENDING") return <DevicePendingScreen logout={logout} />;
  if (deviceStatus === "BLOCKED") return <DeviceBlockedScreen logout={logout} />;

  const resolvedNavItems = NAV_ITEMS.map(item => ({
    ...item,
    href: `/${locale}${item.href}`,
    label: tNav(item.label),
  }));

  const resolvedAdminNavItem = {
    ...ADMIN_NAV_ITEM,
    href: `/${locale}${ADMIN_NAV_ITEM.href}`,
    label: tNav(ADMIN_NAV_ITEM.label),
  };

  const navItems =
    user.role === "ADMIN" ? [...resolvedNavItems, resolvedAdminNavItem] : resolvedNavItems;

  const baseDockItems: NavItem[] =
    user.role === "ADMIN"
      ? [MOBILE_DOCK_BASE[0] as NavItem, MOBILE_DOCK_BASE[1] as NavItem, MOBILE_DOCK_BASE[2] as NavItem, MOBILE_DOCK_BASE[3] as NavItem]
      : MOBILE_DOCK_BASE;

  const dockItems = baseDockItems.map((item: NavItem) => ({
    ...item,
    href: `/${locale}${item.href}`,
    label: tNav(item.label),
  }));

  const moreItems = navItems.filter((item: NavItem) =>
    !baseDockItems.some((d: NavItem) => d.href === item.href.replace(`/${locale}`, ""))
  );

  return (
    <div className="min-h-dvh bg-background">

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <Brand locale={locale} />
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
        </nav>
        <SessionFooter user={user} onLogout={logout} locale={locale} />
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand compact locale={locale} />
        <ThemeToggle />
      </header>

      {/* Contenido */}
      <main className="px-4 pb-28 pt-5 md:pl-64 md:pr-8 md:pb-10 lg:px-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      {/* Dock móvil */}
      <nav
        aria-label={tNav("mainNav")}
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-border bg-card/95 px-2 py-1.5 shadow-xl shadow-black/20 backdrop-blur safe-bottom md:hidden"
      >
        {dockItems.map((item) => {
          const active = isActivePath(pathname, item.href);
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
          onClick={() => setShowMore(true)}
          aria-label={tNav("more")}
          className="flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <MoreHorizontal className="size-5" />
          {tNav("more")}
        </button>
      </nav>

      {/* Bottom sheet "Más" */}
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-28 shadow-xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{tNav("more")}</h2>
              <button onClick={() => setShowMore(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {moreItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
              <hr className="my-2 border-border" />
              <button
                onClick={() => { setShowMore(false); logout(); }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-5" />
                {tNav("logout")}
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function Brand({ compact, locale }: { compact?: boolean; locale: string }) {
  return (
    <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 px-2">
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
  locale,
}: {
  user: { name: string | null; email: string; role: string };
  onLogout: () => void;
  locale: string;
}) {
  const tSession = useTranslations("session");
  const tCommon = useTranslations("common");
  return (
    <div className="mt-4 border-t border-border pt-4">
      <Link href={`/${locale}/cuenta`} className="mb-3 flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-muted">
        <Avatar name={user.name ?? user.email} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name ?? tCommon("user")}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-2">
        <ThemeToggle />
        <Button variant="ghost" onClick={onLogout} className="flex-1 justify-start px-3 text-xs">
          <LogOut className="size-4" /> {tSession("logoutBtn")}
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
  const tNav = useTranslations("nav");
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={tNav("changeTheme")} className="px-2.5">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function PasswordResetScreen({
  refresh,
  logout,
}: {
  refresh: () => void;
  logout: () => void;
}) {
  const toast = useToast();
  const tSession = useTranslations("session");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast(tSession("passwordUpdated"), "success");
      setCurrentPassword("");
      setNewPassword("");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : tSession("passwordError"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-scale-in rounded-card border border-border bg-card p-8 shadow-xl shadow-black/5">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <KeyRound className="size-7 text-warning" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <h1 className="text-lg font-bold">{tSession("tempPassword")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tSession("tempPasswordDesc")}
            </p>
          </div>
          <div>
            <Label htmlFor="pw-current">{tSession("currentPassword")}</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pw-new">{tSession("newPassword")}</Label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{tSession("minChars")}</p>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {tSession("savePassword")}
          </Button>
          <Button type="button" variant="ghost" onClick={logout} className="w-full text-xs">
            {tSession("logoutBtn")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function DevicePendingScreen({ logout }: { logout: () => void }) {
  const tSession = useTranslations("session");
  return (
    <GateScreen
      icon={<Hourglass className="size-7 text-warning" />}
      title={tSession("pendingDevice")}
      message={tSession("pendingDeviceMsg")}
      onLogout={logout}
    />
  );
}

function DeviceBlockedScreen({ logout }: { logout: () => void }) {
  const tSession = useTranslations("session");
  return (
    <GateScreen
      icon={<Ban className="size-7 text-destructive" />}
      title={tSession("blockedDevice")}
      message={tSession("blockedDeviceMsg")}
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
  const tSession = useTranslations("session");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-scale-in rounded-card border border-border bg-card p-8 text-center shadow-xl shadow-black/5">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          {icon}
        </div>
        <h1 className="mb-2 text-lg font-bold">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onLogout} className="w-full">
          {tSession("logoutBtn")}
        </Button>
      </div>
    </div>
  );
}
