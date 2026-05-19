import { expect, test } from "@playwright/test";

// The sign-up form renders required-field labels as "<label> *", so getByLabel
// can't match exactly — target the inputs by their stable id (= name).
test.describe("sign up", () => {
  test("rejects mismatched passwords", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.locator("#name").fill("Test Volunteer");
    await page.locator("#email").fill(`e2e-mismatch-${Date.now()}@example.com`);
    await page.locator("#password").fill("password123");
    await page.locator("#confirm").fill("different123");
    await page.getByRole("button", { name: /Create account/i }).click();

    await expect(page.getByText(/Passwords don.t match/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("creates an account and routes into the onboarding questionnaire", async ({
    page,
  }) => {
    const email = `e2e-signup-${Date.now()}@example.com`;
    await page.goto("/auth/sign-up");
    await page.locator("#name").fill("E2E New Volunteer");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("supersecret1");
    await page.locator("#confirm").fill("supersecret1");
    await page.getByRole("button", { name: /Create account/i }).click();

    // New accounts always start at the profile questionnaire.
    await page.waitForURL("**/me/profile/complete");
    await expect(page).toHaveURL(/\/me\/profile\/complete/);
  });
});

test.describe("sign in", () => {
  test("shows an error for bad credentials", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Assert the specific message — `getByRole("alert")` also matches Next's
    // empty route announcer, tripping strict mode.
    await expect(
      page.getByText(/That email and password don.t match/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("a seeded volunteer can sign in and reach their dashboard", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("volunteer@fairfood.test");
    await page.getByLabel("Password", { exact: true }).fill("fairfood");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.waitForURL("**/me");
    await expect(
      page.getByRole("heading", { name: /Your shifts at the kai table/i }),
    ).toBeVisible();
  });
});
