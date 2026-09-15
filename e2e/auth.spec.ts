import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page loads with form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='email'], input[name='email'], input[placeholder*='mail']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("register page loads with form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("input[type='email'], input[name='email'], input[placeholder*='mail']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });
});

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
  });

  test("non-existent page returns 404", async ({ page }) => {
    const response = await page.goto("/non-existent-page-xyz");
    expect(response?.status()).toBe(404);
  });
});
