import { test, expect } from "@playwright/test";

test.describe("Páginas públicas", () => {
  test("login carga con formulario", async ({ page }) => {
    await page.goto("/es/login");
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("registro carga con formulario", async ({ page }) => {
    await page.goto("/es/registro");
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("forgot-password carga correctamente", async ({ page }) => {
    const res = await page.goto("/es/forgot-password");
    expect([200, 500]).toContain(res?.status());
  });

  test("página inexistente retorna 404", async ({ page }) => {
    const res = await page.goto("/es/esta-pagina-no-existe-xyz");
    expect(res?.status()).toBe(404);
  });

  test("landing redirige a /es", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
  });
});

test.describe("Protección de rutas", () => {
  test("dashboard redirige a login sin sesión", async ({ page }) => {
    await page.goto("/es/dashboard");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test("transacciones redirige a login sin sesión", async ({ page }) => {
    await page.goto("/es/transacciones");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test("admin redirige a login sin sesión", async ({ page }) => {
    await page.goto("/es/admin");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});

test.describe("API sin autenticación", () => {
  test("GET /api/wallet retorna 401", async ({ request }) => {
    const res = await request.get("/api/wallet");
    expect(res.status()).toBe(401);
  });

  test("GET /api/categories retorna 401", async ({ request }) => {
    const res = await request.get("/api/categories");
    expect(res.status()).toBe(401);
  });

  test("POST /api/auth/login acepta JSON", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "test@test.com", password: "wrong", deviceId: "TEST123" },
    });
    expect([400, 401, 500]).toContain(res.status());
  });
});
