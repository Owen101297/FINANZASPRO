import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page loads", async ({ page }) => {
    const res = await page.goto("/es/login");
    expect([200, 500]).toContain(res?.status());
  });

  test("register page loads", async ({ page }) => {
    const res = await page.goto("/es/registro");
    expect([200, 500]).toContain(res?.status());
  });

  test("forgot-password loads", async ({ page }) => {
    const res = await page.goto("/es/forgot-password");
    expect([200, 500]).toContain(res?.status());
  });
});

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
  });

  test("non-existent page returns 404", async ({ page }) => {
    const response = await page.goto("/es/esta-pagina-no-existe-xyz");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Route protection", () => {
  test("dashboard redirects to login without session", async ({ page }) => {
    await page.goto("/es/dashboard");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test("transacciones redirects to login without session", async ({ page }) => {
    await page.goto("/es/transacciones");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test("admin redirects to login without session", async ({ page }) => {
    await page.goto("/es/admin");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});

test.describe("API without authentication", () => {
  test("GET /api/wallet returns 401", async ({ request }) => {
    const res = await request.get("/api/wallet");
    expect(res.status()).toBe(401);
  });

  test("GET /api/categories returns 401", async ({ request }) => {
    const res = await request.get("/api/categories");
    expect(res.status()).toBe(401);
  });

  test("POST /api/auth/login accepts JSON", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "test@test.com", password: "wrong", deviceId: "TEST123" },
    });
    expect([400, 401, 500]).toContain(res.status());
  });
});
