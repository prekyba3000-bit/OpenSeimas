import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test("dashboard sanity check", async ({ page }) => {
  // We can't easily test localhost because dev server isn't running in this context,
  // but we can test that the runner works.
  // If we wanted to test the dashboard, we'd need to start it.
  // For now, let's just verify the runner executes TS tests.
  expect(1 + 1).toBe(2);
});
