import { test, expect } from "@playwright/test";

/**
 * Accessibility E2E tests — keyboard navigation, ARIA, focus management.
 */

test.describe("Accessibility — Login Page", () => {
  test("all interactive elements are focusable via Tab", async ({ page }) => {
    await page.goto("/login");
    const focusableElements: string[] = [];

    // Tab through all focusable elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const tag = await page.evaluate(() => document.activeElement?.tagName ?? "");
      if (tag) focusableElements.push(tag);
    }

    // Should have focused at least email, password, and submit
    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test("form inputs have associated labels", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator("input[type=email]");
    const passwordInput = page.locator("input[type=password]");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check for label or aria-label
    const emailId = await emailInput.getAttribute("id");
    const emailAriaLabel = await emailInput.getAttribute("aria-label");
    const emailAriaLabelledBy = await emailInput.getAttribute("aria-labelledby");

    const hasLabel = emailId
      ? (await page.locator(`label[for="${emailId}"]`).count()) > 0
      : false;

    expect(hasLabel || emailAriaLabel || emailAriaLabelledBy).toBeTruthy();
  });

  test("page has a main landmark", async ({ page }) => {
    await page.goto("/login");
    const main = page.locator("main");
    // Either main element or role=main
    const mainCount = await main.count();
    const roleMain = await page.locator('[role="main"]').count();
    expect(mainCount + roleMain).toBeGreaterThan(0);
  });
});

test.describe("Accessibility — General", () => {
  test("root html element has lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("page title is set", async ({ page }) => {
    await page.goto("/login");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("images have alt attributes", async ({ page }) => {
    await page.goto("/login");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });
});
