/** Formateadores compartidos por la UI. */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("es-EC", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDayMonth(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
}

/** YYYY-MM del mes actual (hora local). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Etiqueta legible de un mes YYYY-MM → "agosto 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
