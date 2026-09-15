/**
 * CI test: CSP report endpoint (P12).
 *
 * Verifica que POST /api/csp-report acepta informes de violación CSP
 * y responde 204 sin importar el contenido.
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/csp-report/route";

async function testCspReport() {
  console.log("=== CI: CSP Report Endpoint (P12) ===\n");

  // Test 1: Violation report format (W3C standard)
  const w3cReport = {
    "csp-report": {
      "document-uri": "https://finanzaspro.owenai.uk/dashboard",
      "referrer": "",
      "violated-directive": "script-src 'self'",
      "effective-directive": "script-src 'self'",
      "original-policy": "default-src 'self'; script-src 'self'",
      "disposition": "enforce",
      "blocked-uri": "https://evil.com/script.js",
      "status-code": 200,
      "source-file": "https://finanzaspro.owenai.uk/dashboard",
      "line-number": 15,
      "column-number": 10,
    },
  };

  const req1 = new NextRequest("https://finanzaspro.owenai.uk/api/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body: JSON.stringify(w3cReport),
  });

  const res1 = await POST(req1);
  console.log(`Test 1 (W3C format): ${res1.status === 204 ? "PASS" : "FAIL"} (status=${res1.status})`);

  // Test 2: Empty/invalid body
  const req2 = new NextRequest("https://finanzaspro.owenai.uk/api/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body: "not json",
  });

  const res2 = await POST(req2);
  console.log(`Test 2 (invalid body): ${res2.status === 204 ? "PASS" : "FAIL"} (status=${res2.status})`);

  // Test 3: Empty object
  const req3 = new NextRequest("https://finanzaspro.owenai.uk/api/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res3 = await POST(req3);
  console.log(`Test 3 (empty body): ${res3.status === 204 ? "PASS" : "FAIL"} (status=${res3.status})`);

  // Test 4: React/Next.js report format (camelCase)
  const reactReport = {
    "csp-report": {
      documentURI: "https://finanzaspro.owenai.uk/dashboard",
      violatedDirective: "style-src 'self'",
      effectiveDirective: "style-src 'self'",
      blockedURI: "inline",
      sourceFile: "https://finanzaspro.owenai.uk/_next/static/chunks/main.js",
      lineNumber: 42,
      columnNumber: 7,
      statusCode: 200,
    },
  };

  const req4 = new NextRequest("https://finanzaspro.owenai.uk/api/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reactReport),
  });

  const res4 = await POST(req4);
  console.log(`Test 4 (React format): ${res4.status === 204 ? "PASS" : "FAIL"} (status=${res4.status})`);

  console.log("\n=== Todos los tests de CSP report pasaron ===");
}

testCspReport().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
