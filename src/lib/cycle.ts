/** Utilidades para calcular el rango del ciclo de presupuesto mensual. */

export interface CycleRange {
  start: Date;
  /** Fin exclusivo del ciclo */
  end: Date;
}

function clampDay(day: number): number {
  return Math.min(Math.max(1, Math.floor(day)), 28);
}

/**
 * Calcula el ciclo actual según el día de inicio configurado.
 * Ej.: cycleStartDay=15 y hoy=20/ago → ciclo 15/ago → 14/sep (end exclusivo).
 */
export function getCycleRange(cycleStartDay: number, ref: Date = new Date()): CycleRange {
  const day = clampDay(cycleStartDay);
  const y = ref.getFullYear();
  const m = ref.getMonth();

  const startThisMonth = new Date(y, m, day);
  const start = ref >= startThisMonth ? startThisMonth : new Date(y, m - 1, day);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day);

  return { start, end };
}

export interface CycleProgress {
  daysElapsed: number;
  daysTotal: number;
}

export function getCycleProgress(cycleStartDay: number, ref: Date = new Date()): CycleProgress {
  const { start, end } = getCycleRange(cycleStartDay, ref);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));
  const daysElapsed = Math.min(
    daysTotal,
    Math.max(1, Math.round((ref.getTime() - start.getTime()) / msPerDay) + 1)
  );
  return { daysElapsed, daysTotal };
}
