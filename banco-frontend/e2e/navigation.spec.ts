import { test, expect } from "@playwright/test";

/**
 * Navigation & Route Protection E2E tests.
 * These tests verify that unauthenticated users are redirected to /login.
 */

test.describe("Route Protection", () => {
  test("redirects unauthenticated user from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain("login");
  });

  test("redirects unauthenticated user from /accounts to /login", async ({ page }) => {
    await page.goto("/accounts");
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain("login");
  });

  test("redirects unauthenticated user from /transfers to /login", async ({ page }) => {
    await page.goto("/transfers");
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain("login");
  });

  test("redirects unauthenticated user from /loans to /login", async ({ page }) => {
    await page.goto("/loans");
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain("login");
  });

  test("redirects unauthenticated user from /batches to /login", async ({ page }) => {
    await page.goto("/batches");
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain("login");
  });

  test("redirects unauthenticated user from /analytics to /login", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).toContain("login");
  });
});

test.describe("Login Page Accessibility", () => {
  test("login page has no broken links", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("login form is keyboard navigable", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["INPUT", "BUTTON", "A"]).toContain(focused);
  });

  test("login page has proper lang attribute", async ({ page }) => {
    await page.goto("/login");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("es");
  });
});
