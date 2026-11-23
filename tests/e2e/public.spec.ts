import { expect, test } from "@playwright/test";

test.describe("public marketing + browse", () => {
  test("home page renders and the nav links work", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Fair Food/i);

    await page.getByRole("link", { name: "Programmes", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: /Find a place that fits the day you.ve got/i,
      }),
    ).toBeVisible();
  });

  test("programmes page lists the programmes", async ({ page }) => {
    await page.goto("/programs");
    await expect(
      page.getByRole("heading", {
        name: /Find a place that fits the day you.ve got/i,
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

  test("a private programme is invisible to the public", async ({ page }) => {
    // Fixture: "School Holiday Crew" is seeded PRIVATE (prisma/seed.dev.ts) —
    // the coordinator-run case. It must not appear anywhere a visitor browses,
    // and its own URL must 404 rather than render.
    await page.goto("/programs");
    await expect(page.getByText(/School Holiday Crew/i)).toHaveCount(0);

    await page.goto("/shifts");
    await expect(page.getByText(/School Holiday Crew/i)).toHaveCount(0);

    const response = await page.goto("/programs/school-holiday-crew");
    expect(response?.status()).toBe(404);
  });

  test("a shift detail page invites an anonymous visitor to sign up", async ({
    page,
  }) => {
    await page.goto("/shifts");
    await page.locator('a[href^="/shifts/"]').first().click();
    await expect(page).toHaveURL(/\/shifts\/[^/]+$/);
    await expect(
      page.getByRole("link", { name: /Sign up & book/i }),
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

test.describe("browser rewrites of server HTML", () => {
  test("a translated page doesn't crash React's DOM updates", async ({ page }) => {
    // Chrome's "Translate this page" swaps each text node for <font>
    // wrappers. React later removes or inserts against the original node,
    // which used to throw NotFoundError mid-commit. The guard from
    // instrumentation-client.ts must be live before hydration.
    await page.goto("/programs");
    const outcome = await page.evaluate(() => {
      const p = document.createElement("p");
      const original = document.createTextNode("Kia ora");
      p.appendChild(original);
      document.body.appendChild(p);
      const font = document.createElement("font");
      font.textContent = "Hello";
      p.replaceChild(font, original);
      try {
        p.insertBefore(document.createTextNode("new"), original);
        p.removeChild(original);
        return p.textContent;
      } catch (err) {
        return String(err);
      } finally {
        p.remove();
      }
    });
    expect(outcome).toBe("Hellonew");
  });

  test("iOS data detectors are switched off", async ({ page }) => {
    // Safari rewriting addresses and dates into links before hydration caused
    // React hydration mismatches on the programme pages.
    await page.goto("/programs");
    await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute(
      "content",
      "telephone=no, date=no, address=no, email=no, url=no",
    );
  });
});
