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

  const mini = !sidebarOpen;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">

      {/* Sidebar desktop — mini or full */}
      <aside
        className={clsx(
          "sticky top-0 hidden h-dvh flex-col bg-muted/50 py-4 transition-[width] duration-200 md:flex",
          mini ? "w-[60px] items-center px-2" : "w-[220px] px-3"
        )}
      >
        {/* Brand */}
        <Link href={`/${locale}/dashboard`} className={clsx(
          "flex shrink-0 items-center gap-2.5",
          mini ? "size-10 justify-center rounded-lg" : "px-2"
        )}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </div>
          {!mini && <span className="text-[15px] font-bold tracking-tight">FinanzasPro</span>}
        </Link>

        {/* Nav */}
        <nav aria-label={tNav("sidebarNav")} className={clsx(
          "mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-thin",
          mini ? "items-center" : ""
        )}>
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} mini={mini} />
          ))}
        </nav>

        {/* Footer: toggle + session + logout */}
        <div className={clsx(
          "mt-4 shrink-0 border-t border-separator pt-3",
          mini ? "w-full flex flex-col items-center" : ""
        )}>
          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? tNav("collapseSidebar") : tNav("expandSidebar")}
            className={clsx(
              "flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              mini ? "mb-2" : "mb-2 w-full gap-3 px-3 py-2 text-[13px]"
            )}
          >
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            {!mini && <span>{tNav("collapseSidebar")}</span>}
          </button>

          {/* User info + logout */}
          {!mini ? (
            <>
              <Link href={`/${locale}/cuenta`} className="mb-2 flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted">
                <Avatar name={user.name ?? user.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{user.name ?? user.email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </Link>
              <Button variant="ghost" onClick={logout} className="w-full justify-start px-3 text-[13px]">
                <LogOut className="size-4" /> {tSession("logoutBtn")}
              </Button>
            </>
          ) : (
            <Link href={`/${locale}/cuenta`} className="mb-1" title={user.name ?? user.email}>
              <Avatar name={user.name ?? user.email} />
            </Link>
          )}
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <BrandCompact locale={locale} />
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto scroll-padding-top-16 px-4 pb-28 pt-2 md:px-8 md:pb-10 md:pt-5 lg:px-10">
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

function BrandCompact({ locale }: { locale: string }) {
  return (
    <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="size-4" />
      </div>
      <span className="text-[15px] font-bold">FinanzasPro</span>
    </Link>
  );
}

function NavLink({ item, active, mini }: { item: NavItem; active: boolean; mini: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={mini ? item.label : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-lg transition-colors",
        mini ? "size-10 justify-center" : "px-3 py-2 text-[13px] font-medium",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {item.icon}
      {!mini && <span>{item.label}</span>}
    </Link>
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
