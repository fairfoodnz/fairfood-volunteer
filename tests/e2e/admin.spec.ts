import { expect, test } from "@playwright/test";

test.describe("admin (signed in as a coordinator)", () => {
  test("dashboard shows the roster overview", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", {
        name: /Today.s rosters & coming weeks/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Volunteers").first()).toBeVisible();
    // The header CTA is "+ New shift"; the sidebar also has a plain
    // "New shift" link, so match the header one exactly.
    await expect(
      page.getByRole("link", { name: "+ New shift" }),
    ).toBeVisible();
  });

  test("shifts management page loads", async ({ page }) => {
    await page.goto("/admin/shifts");
    await expect(page).toHaveURL(/\/admin\/shifts$/);
    // The admin sidebar (chrome that only renders past the ADMIN guard) is present.
    await expect(
      page.getByRole("link", { name: /New shift/i }).first(),
    ).toBeVisible();
  });

  test("can open the new-shift form", async ({ page }) => {
    await page.goto("/admin/shifts/new");
    await expect(page).toHaveURL(/\/admin\/shifts\/new$/);
    await expect(
      page.getByRole("heading", { name: /Add a shift to the roster/i }),
    ).toBeVisible();
    // Stable form anchors (a generic `form` locator also matches the sidebar
    // sign-out form).
    await expect(page.getByLabel("Programme")).toBeVisible();
    await expect(page.getByLabel("Capacity")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create shift" }),
    ).toBeVisible();
  });
});
