import { test, expect } from "@playwright/test";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || "princechaawa@gmail.com";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || "Newpassword123!";
const TEST_ACCOUNT = "2131955215";
const TEST_BANK_NAME = "United Bank for Africa";

test.describe("Account setup bank verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("you@example.com").fill(OWNER_EMAIL);
    await page.getByPlaceholder("••••••••").fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: /Sign In/i }).first().click();
    await page.waitForURL(/dashboard/, { timeout: 60000 });
  });

  test("resolves account name after entering account number and bank", async ({ page }) => {
    await page.goto("/settings/financial", { waitUntil: "domcontentloaded" });

    // Enter 10-digit account number
    const accountNumber = page.getByPlaceholder("Enter 10-digit account number");
    await expect(accountNumber).toBeVisible({ timeout: 30000 });
    await accountNumber.fill(TEST_ACCOUNT);

    // Select bank from dropdown
    const bankSelect = page.locator("select").first();
    await bankSelect.selectOption({ label: TEST_BANK_NAME });

    // Wait for account name to resolve
    const accountName = page.getByRole("textbox").last();
    await expect(accountName).toHaveValue(/luka/i, { timeout: 30000 });
    const value = await accountName.inputValue();
    console.log(`Resolved account name: ${value}`);
  });
});