import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page loads with form", async ({ page }) => {
    await page.goto("/es/login");
    await expect(page.locator("#email, input[type='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("register page loads with form", async ({ page }) => {
    await page.goto("/es/registro");
    await expect(page.locator("#email, input[type='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });
});

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
  });

  test("non-existent page returns 404", async ({ page }) => {
    const response = await page.goto("/es/non-existent-page-xyz");
    expect(response?.status()).toBe(404);
  });
});
