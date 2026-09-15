import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e-${Date.now()}@test.com`;
const TEST_PASSWORD = "Test1234!";

test.describe("Flujo completo: registro → login → dashboard", () => {
  test("registro crea cuenta y redirige a login", async ({ page }) => {
    await page.goto("/registro");

    // Llenar formulario de registro
    await page.locator("#name, input[placeholder*='nombre']").first().fill("E2E User");
    await page.locator("#email, input[type='email']").first().fill(TEST_EMAIL);
    const passwordInputs = page.locator("input[type='password']");
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);

    // Submit
    await page.locator("button[type='submit']").click();

    // Debería redirigir a login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test("login con credenciales inválidas muestra error", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#email, input[type='email']").first().fill("noexiste@test.com");
    await page.locator("input[type='password']").first().fill("wrongpassword");
    await page.locator("button[type='submit']").click();

    // Debería mostrar algún error (toast o mensaje)
    await expect(page.locator("text=/error|incorrecto|inválida/i").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("login exitoso redirige a dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#email, input[type='email']").first().fill(TEST_EMAIL);
    await page.locator("input[type='password']").first().fill(TEST_PASSWORD);
    await page.locator("button[type='submit']").click();

    // Redirige a dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });
});

test.describe("Dashboard y navegación", () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto("/login");
    await page.locator("#email, input[type='email']").first().fill(TEST_EMAIL);
    await page.locator("input[type='password']").first().fill(TEST_PASSWORD);
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test("dashboard carga con widgets", async ({ page }) => {
    // Verificar que el dashboard tiene contenido
    await expect(page.locator("text=/saldo|balance|dashboard/i").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("navegación a transacciones", async ({ page }) => {
    await page.goto("/transacciones");
    await expect(page).toHaveURL(/.*transacciones/);
  });

  test("navegación a cuentas", async ({ page }) => {
    await page.goto("/cuentas");
    await expect(page).toHaveURL(/.*cuentas/);
  });

  test("navegación a categorías", async ({ page }) => {
    await page.goto("/categorias");
    await expect(page).toHaveURL(/.*categorias/);
  });

  test("navegación a suscripciones", async ({ page }) => {
    await page.goto("/suscripciones");
    await expect(page).toHaveURL(/.*suscripciones/);
  });

  test("navegación a metas", async ({ page }) => {
    await page.goto("/metas");
    await expect(page).toHaveURL(/.*metas/);
  });

  test("navegación a deudas", async ({ page }) => {
    await page.goto("/deudas");
    await expect(page).toHaveURL(/.*deudas/);
  });

  test("navegación a análisis", async ({ page }) => {
    await page.goto("/analisis");
    await expect(page).toHaveURL(/.*analisis/);
  });
});

test.describe("API responses", () => {
  test("GET /api/wallet retorna 200 con sesión válida", async ({ request }) => {
    // Primero hacer login para obtener la cookie
    const loginRes = await request.post("/api/auth/login", {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        deviceId: "E2ETESTDEVICE01",
      },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Luego consultar wallet
    const walletRes = await request.get("/api/wallet");
    expect(walletRes.ok()).toBeTruthy();
    const data = await walletRes.json();
    expect(data).toHaveProperty("wallet");
    expect(data).toHaveProperty("summary");
  });

  test("GET /api/wallet retorna 401 sin sesión", async ({ request }) => {
    const res = await request.get("/api/wallet");
    expect(res.status()).toBe(401);
  });
});

test.describe("Páginas públicas", () => {
  test("landing carga correctamente", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
  });

  test("login es accesible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("registro es accesible", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("forgot-password es accesible", async ({ page }) => {
    const res = await page.goto("/forgot-password");
    expect(res?.status()).toBeLessThan(500);
  });

  test("página inexistente retorna 404", async ({ page }) => {
    const res = await page.goto("/esta-pagina-no-existe-xyz");
    expect(res?.status()).toBe(404);
  });
});
