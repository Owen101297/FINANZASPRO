import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint para recibir informes de violaciones de CSP (Content Security Policy).
 *
 * Los navegadores envían un POST con Content-Type application/csp-report
 * cuando una política es violada. Este handler los registra en la consola
 * para debugging y, en producción, podría enviarse a un servicio de monitoreo.
 *
 * Referencia: https://w3c.github.io/webappsec-csp/#directive-report-uri
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const report = body["csp-report"] ?? body;

    const violation = {
      documentUri: report["document-uri"] ?? report.documentURI ?? "unknown",
      violatedDirective: report["violated-directive"] ?? report.violatedDirective ?? "unknown",
      effectiveDirective: report["effective-directive"] ?? report.effectiveDirective ?? "unknown",
      blockedUri: report["blocked-uri"] ?? report.blockedURI ?? "none",
      sourceFile: report["source-file"] ?? report.sourceFile ?? "unknown",
      lineNumber: report["line-number"] ?? report.lineNumber ?? 0,
      columnNumber: report["col-number"] ?? report.columnNumber ?? 0,
      statusCode: report["status-code"] ?? report.statusCode ?? 0,
      timestamp: new Date().toISOString(),
    };

    console.error("[CSP-VIOLATION]", JSON.stringify(violation));
  } catch {
    // Si el body no es JSON válido o falta, ignorar silenciosamente.
  }

  return new NextResponse(null, { status: 204 });
}
