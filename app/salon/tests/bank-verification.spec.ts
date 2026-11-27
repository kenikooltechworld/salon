import { test, expect } from "@playwright/test";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || "princechaawa@gmail.com";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || "Newpassword123!";
const TEST_ACCOUNT = "2131955215";
const TEST_BANK_NAME = "United Bank For Africa";

test.describe("Account setup bank verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: /Sign In/i }).first().click();
    await page.waitForURL(/dashboard/, { timeout: 60000 });
  });

  test("shows saved account details with edit button and pre-filled edit form", async ({ page }) => {
    await page.goto("/settings/financial", { waitUntil: "domcontentloaded" });

    // View mode: saved account details + Edit button
    await expect(page.getByText(/Account setup complete/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: /Edit/i }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Business Name:/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Account Number:/i)).toBeVisible({ timeout: 30000 });

    // Click Edit -> form pre-filled with saved values
    await page.getByRole("button", { name: /Edit/i }).first().click();
    const accountNumber = page.getByPlaceholder("Enter 10-digit account number");
    await expect(accountNumber).toBeVisible({ timeout: 30000 });
    await expect(accountNumber).toHaveValue(TEST_ACCOUNT);
    const businessName = page.getByPlaceholder("Displayed on receipts");
    await expect(businessName).toBeVisible({ timeout: 30000 });
    await expect(businessName).toHaveValue(/prince/i);
  });
});
