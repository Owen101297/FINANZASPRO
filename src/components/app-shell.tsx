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
  PanelLeftClose,
  PanelLeftOpen,
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
  NAV_ITEMS[0] as NavItem,
  NAV_ITEMS[1] as NavItem,
  NAV_ITEMS[2] as NavItem,
  NAV_ITEMS[3] as NavItem,
];

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="flex min-h-dvh bg-background">

      {/* Sidebar desktop */}
      <aside
        className={clsx(
          "hidden flex-col bg-muted/50 px-3 py-5 transition-[width] duration-200 md:flex",
          sidebarOpen ? "w-[220px]" : "w-0 overflow-hidden px-0"
        )}
      >
        {sidebarOpen && (
          <>
            <Brand locale={locale} />
            <nav aria-label={tNav("sidebarNav")} className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-thin">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
              ))}
            </nav>
            <SessionFooter user={user} onLogout={logout} locale={locale} />
          </>
        )}
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? tNav("collapseSidebar") : tNav("expandSidebar")}
          className={clsx(
            "fixed top-4 z-40 hidden rounded-lg bg-card p-1.5 text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground md:block",
            sidebarOpen ? "left-[236px]" : "left-3"
          )}
        >
          {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </button>

        {/* Header mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Brand compact locale={locale} />
          <ThemeToggle />
        </header>

        {/* Contenido */}
        <main className="flex-1 px-4 pb-28 pt-2 md:px-8 md:pb-10 md:pt-5 lg:px-10">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>

        {/* Dock móvil */}
        <nav
          aria-label={tNav("mainNav")}
          className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-[22px] bg-[#f9f9f9]/80 px-2 py-1.5 shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-xl safe-bottom dark:bg-[#2c2c2e]/80 dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)] md:hidden"
        >
          {dockItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-w-[64px] flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
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
            className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="size-5" />
            {tNav("more")}
          </button>
        </nav>
      </div>

      {/* Bottom sheet "Más" */}
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[20px] bg-card p-4 pb-28 shadow-xl animate-slide-up">
            <div className="mx-auto mb-1 h-[5px] w-[36px] rounded-full bg-[#c7c7cc] dark:bg-[#636366]" />
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-[17px] font-semibold">{tNav("more")}</h2>
              <button onClick={() => setShowMore(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5">
              {moreItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-muted" />
              <button
                onClick={() => { setShowMore(false); logout(); }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-destructive transition-colors hover:bg-destructive/10"
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
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="size-4" />
      </div>
      {!compact && (
        <span className="text-[15px] font-bold tracking-tight">FinanzasPro</span>
      )}
      {compact && <span className="text-[15px] font-bold">FinanzasPro</span>}
    </Link>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
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
    <div className="mt-4 border-t border-separator pt-4">
      <Link href={`/${locale}/cuenta`} className="mb-3 flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted">
        <Avatar name={user.name ?? user.email} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{user.name ?? tCommon("user")}</p>
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-2">
        <ThemeToggle />
        <Button variant="ghost" onClick={onLogout} className="flex-1 justify-start px-3 text-[13px]">
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
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
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
      <div className="w-full max-w-sm animate-scale-in rounded-card bg-card p-8 shadow-xl shadow-black/5">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-warning/10">
          <KeyRound className="size-7 text-warning" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <h1 className="text-[17px] font-semibold">{tSession("tempPassword")}</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
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
            <p className="mt-1 text-[13px] text-muted-foreground">{tSession("minChars")}</p>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {tSession("savePassword")}
          </Button>
          <Button type="button" variant="ghost" onClick={logout} className="w-full text-[13px]">
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
      <div className="w-full max-w-sm animate-scale-in rounded-card bg-card p-8 text-center shadow-xl shadow-black/5">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          {icon}
        </div>
        <h1 className="mb-2 text-[17px] font-semibold">{title}</h1>
        <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onLogout} className="w-full">
          {tSession("logoutBtn")}
        </Button>
      </div>
    </div>
  );
}
