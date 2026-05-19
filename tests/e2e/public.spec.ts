import { expect, test } from "@playwright/test";

test.describe("public marketing + browse", () => {
  test("home page renders and the nav links work", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Fair Food/i);

    await page.getByRole("link", { name: "Programmes", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: /Three ways to roll up your sleeves with us/i,
      }),
    ).toBeVisible();
  });

  test("programmes page lists the programmes", async ({ page }) => {
    await page.goto("/programs");
    await expect(
      page.getByRole("heading", {
        name: /Three ways to roll up your sleeves with us/i,
      }),
    ).toBeVisible();
  });

  test("open shifts page shows the roster", async ({ page }) => {
    await page.goto("/shifts");
    await expect(
      page.getByRole("heading", { name: /Open shifts in Avondale/i }),
    ).toBeVisible();
    // Seeded data always has upcoming shifts → at least one detail link.
    await expect(
      page.locator('a[href^="/shifts/"]').first(),
    ).toBeVisible();
  });

  test("a shift detail page invites an anonymous visitor to sign up", async ({
    page,
  }) => {
    await page.goto("/shifts");
    await page.locator('a[href^="/shifts/"]').first().click();
    await expect(page).toHaveURL(/\/shifts\/[^/]+$/);
    await expect(
      page.getByRole("link", { name: /Create account & book/i }),
    ).toBeVisible();
  });
});

test.describe("auth guards (logged out)", () => {
  test("/me redirects to sign-in", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("/admin redirects to sign-in with a return path", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin|\/auth\/sign-in\?next=\/admin/);
  });
});
