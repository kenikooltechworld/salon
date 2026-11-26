import { test, expect } from "@playwright/test";

const EMAIL = "princechaawa@gmail.com";
const PASSWORD = "Newpassword123!";

test.use({ storageState: { cookies: [], origins: [] } });

async function login(page) {
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

test.describe("Paystack settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
  });

  test("login redirects to dashboard", async ({ page }) => {
    await login(page);
  });

  test("paystack settings page loads after login", async ({ page }) => {
    await login(page);

    await page.goto("/settings/paystack");
    await expect(page).toHaveURL("/settings/paystack", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Page should show the registration form (or error if subaccount fetch fails)
    const hasForm = await page.getByPlaceholder("Business Name").isVisible();
    const hasError = await page.getByText(/Failed to load Paystack subaccount/i).isVisible();
    expect(hasForm || hasError).toBe(true);
  });

  test("paystack page shows registration form with all fields", async ({ page }) => {
    await login(page);

    await page.goto("/settings/paystack");
    await expect(page).toHaveURL("/settings/paystack", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Verify all form elements are present
    await expect(page.getByPlaceholder("Business Name")).toBeVisible();
    await expect(page.getByPlaceholder("Settlement Bank")).toBeVisible();
    await expect(page.getByPlaceholder("Account Number")).toBeVisible();
    await expect(page.getByRole("button", { name: /Register Subaccount/i })).toBeVisible();
  });
});