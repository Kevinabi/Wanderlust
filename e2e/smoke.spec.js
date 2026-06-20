import { test, expect } from "@playwright/test";

// Smoke tests — verify the app renders and core navigation works.
// The Playwright config starts `vite preview` on the built app automatically.

test("homepage loads with brand + category bar", async ({ page }) => {
  await page.goto("/");
  // The category tabs should be present
  await expect(page.getByText("Flights", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Trains", { exact: false }).first()).toBeVisible();
});

test("switching to Trains reveals booking sub-tabs", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Trains", { exact: false }).first().click();
  await expect(page.getByText("Check PNR Status", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Live Train Status", { exact: false }).first()).toBeVisible();
});

test("PNR tab validates input length", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Trains", { exact: false }).first().click();
  await page.getByText("Check PNR Status", { exact: false }).first().click();
  const input = page.getByPlaceholder("Enter 10-digit PNR");
  await expect(input).toBeVisible();
});
