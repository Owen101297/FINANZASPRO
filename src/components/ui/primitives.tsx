"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

// ─────────────────────────── Button ───────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-transparent text-primary hover:bg-primary/10",
  ghost: "text-primary hover:bg-primary/10",
  danger: "bg-transparent text-destructive hover:bg-destructive/10",
  outline: "border border-border bg-transparent hover:bg-muted text-foreground",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-[15px]",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

// ─────────────────────────── Input ────────────────────────────

const fieldClasses =
  "w-full rounded-xl bg-[#e5e5ea] dark:bg-[#2c2c2e] px-4 py-3 text-[17px] text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClasses, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(fieldClasses, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx(
        "mb-1.5 block text-[13px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

// ─────────────────────────── Card ─────────────────────────────

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-card bg-card shadow-sm", className)}
      {...props}
    />
  );
}

// ─────────────────────────── Badge ────────────────────────────

type BadgeTone = "neutral" | "positive" | "negative" | "warning" | "accent";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
  warning: "bg-warning/10 text-warning",
  accent: "bg-accent/10 text-accent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

// ─────────────────────── Progress bar ─────────────────────────

export function Progress({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "warning" | "danger";
  className?: string;
}) {
  const color =
    tone === "danger"
      ? "bg-destructive"
      : tone === "warning"
        ? "bg-warning"
        : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={clsx("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─────────────────────── Empty state ──────────────────────────

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && (
        <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-[17px] font-semibold text-foreground">{title}</p>
      {hint && <p className="max-w-xs text-[15px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ───────────────────────── Modal ──────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      const focusable = getFocusable();
      const first = focusable[0];
      if (first) first.focus();
      else dialogRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open, getFocusable]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, getFocusable]);

  useEffect(() => {
    if (!open && previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        role="presentation"
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 max-h-[92vh] w-full animate-scale-in overflow-y-auto scrollbar-thin rounded-t-[20px] bg-card p-6 sm:max-w-md sm:rounded-2xl safe-bottom outline-none"
      >
        <div className="mx-auto mb-4 h-[5px] w-[36px] rounded-full bg-[#c7c7cc] dark:bg-[#636366] sm:hidden" />
        <h3 className="mb-5 text-[17px] font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ───────────────────── Page header ────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────── Spinner ────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Cargando">
      <svg className={clsx("animate-spin", className)} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
