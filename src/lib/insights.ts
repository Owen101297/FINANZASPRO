/**
 * Motor de insights basado en reglas locales (sin IA externa).
 * Genera diagnósticos accionables a partir del análisis mensual.
 */

export interface AnalysisInput {
  totals: {
    income: number;
    expense: number;
    net: number;
    salary: number;
  };
  byCategory: Array<{ name: string; total: number; pct: number }>;
  dailySeries: Array<{ day: number; total: number }>;
  subscriptionsMonthly: number;
  transactionCount: number;
}

export interface Insight {
  kind: "positive" | "warning" | "danger" | "info";
  message: string;
}

export function buildInsights(a: AnalysisInput): Insight[] {
  const insights: Insight[] = [];
  const { income, expense, net, salary } = a.totals;

  // Diagnóstico principal: balance del mes
  if (expense === 0 && income === 0) {
    insights.push({
      kind: "info",
      message:
        "Aún no hay movimientos registrados este mes. Registra tus ingresos y gastos para recibir un diagnóstico.",
    });
  } else if (net >= 0) {
    const savingRate = income > 0 ? Math.round((net / income) * 100) : 0;
    insights.push({
      kind: "positive",
      message: `Buen mes: gastaste menos de lo que ingresas. Tasa de ahorro del ${savingRate}%. ${
        savingRate >= 20
          ? "Estás por encima del 20% recomendado, ¡excelente disciplina!"
          : "Intenta llevar tu tasa de ahorro al 20% o más."
      }`,
    });
  } else {
    insights.push({
      kind: "danger",
      message: `Gastaste ${Math.abs(net).toLocaleString("es", { style: "currency", currency: "USD" })} más de lo que ingresaste este mes. Revisa las categorías con mayor peso y ajusta antes de fin de ciclo.`,
    });
  }

  // Alerta de presupuesto contra el salario
  if (salary > 0 && expense > 0) {
    const usedPct = Math.round((expense / salary) * 100);
    if (usedPct > 100) {
      insights.push({
        kind: "danger",
        message: `Has superado tu salario en un ${usedPct - 100}% este ciclo. Considera recortar gastos no esenciales o revisar tus metas de ahorro.`,
      });
    } else if (usedPct >= 90) {
      insights.push({
        kind: "warning",
        message: `Alerta crítica: llevas el ${usedPct}% de tu salario gastado. Queda muy poco margen hasta el cierre del ciclo.`,
      });
    } else if (usedPct >= 70) {
      insights.push({
        kind: "warning",
        message: `Ya usaste el ${usedPct}% de tu presupuesto mensual. Vigila los gastos variables para cerrar el ciclo sin pasarte.`,
      });
    }
  }

  // Categoría dominante
  const top = a.byCategory[0];
  if (top && expense > 0) {
    if (top.pct >= 40) {
      insights.push({
        kind: "warning",
        message: `"${top.name}" concentra el ${top.pct}% de tus gastos (${top.total.toLocaleString("es", { style: "currency", currency: "USD" })}). Diversificar o ponerle un límite podría equilibrar tu presupuesto.`,
      });
    } else {
      insights.push({
        kind: "info",
        message: `Tu mayor categoría es "${top.name}" con el ${top.pct}% del gasto total.`,
      });
    }
  }

  // Suscripciones
  if (a.subscriptionsMonthly > 0) {
    const subPctOfExpense = expense > 0 ? Math.round((a.subscriptionsMonthly / expense) * 100) : 0;
    insights.push({
      kind: subPctOfExpense >= 25 ? "warning" : "info",
      message: `Tus suscripciones activas suman ${a.subscriptionsMonthly.toLocaleString("es", { style: "currency", currency: "USD" })} al mes${
        expense > 0 ? ` (${subPctOfExpense}% de tu gasto)` : ""
      }. Revisa si usas todas; cancelar una puede liberar presupuesto.`,
    });
  }

  // Ritmo de gasto vs días transcurridos
  const daysWithData = a.dailySeries.filter((d) => d.total > 0).length;
  const lastDayWithData = [...a.dailySeries].reverse().find((d) => d.total > 0)?.day ?? 0;
  if (lastDayWithData > 3 && daysWithData < lastDayWithData / 2) {
    insights.push({
      kind: "info",
      message: `Registraste gastos solo en ${daysWithData} de los últimos ${lastDayWithData} días activos. Anotar todo mejora la precisión de este análisis.`,
    });
  }

  return insights.slice(0, 5);
}
