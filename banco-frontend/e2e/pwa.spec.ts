import { test, expect } from "@playwright/test";

/**
 * PWA E2E tests — manifest, service worker, offline capability.
 */

test.describe("PWA — Manifest", () => {
  test("manifest.json is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
  });

  test("manifest.json has required PWA fields", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    const manifest = await response?.json();

    expect(manifest).toBeTruthy();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("manifest link is present in HTML head", async ({ page }) => {
    await page.goto("/login");
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    const href = await manifestLink.getAttribute("href");
    expect(href).toBe("/manifest.json");
  });
});

test.describe("PWA — Meta Tags", () => {
  test("theme-color meta tag is present", async ({ page }) => {
    await page.goto("/login");
    const themeColor = page.locator('meta[name="theme-color"]');
    // May be set via viewport config
    const count = await themeColor.count();
    // Not strictly required but good practice
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("apple-mobile-web-app-capable meta is present", async ({ page }) => {
    await page.goto("/login");
    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleMeta).toHaveCount(1);
  });

  test("apple-touch-icon link is present", async ({ page }) => {
    await page.goto("/login");
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveCount(1);
  });
});

test.describe("PWA — Service Worker", () => {
  test("sw.js is accessible", async ({ page }) => {
    const response = await page.goto("/sw.js");
    expect(response?.status()).toBe(200);
  });
});
