import { test } from "@playwright/test";

test("inspect financial settings page", async ({ page }) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("you@example.com").fill(process.env.E2E_OWNER_EMAIL || "princechaawa@gmail.com");
  await page.getByPlaceholder("••••••••").fill(process.env.E2E_OWNER_PASSWORD || "Newpassword123!");
  await page.getByRole("button", { name: /Sign In/i }).first().click();
  await page.waitForURL(/dashboard/, { timeout: 60000 });

  await page.goto("/settings/financial", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  const body = await page.innerText("body").catch(() => "innerText failed");
  console.log("=== PAGE TEXT (first 3000) ===");
  console.log(String(body).substring(0, 3000));
  const visible = await page.getByText("Financial Settings", { exact: false }).count();
  console.log("=== Financial Settings visible count: " + visible);
});