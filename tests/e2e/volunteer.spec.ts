import { expect, test, type Page } from "@playwright/test";

// A shift can render the "Confirm booking" button yet still be unbookable for
// the seeded volunteer: if they have a *cancelled* booking on it the page only
// counts CONFIRMED bookings (so the form shows), but bookShiftAction does a
// create() that trips the @@unique([userId, shiftId]) constraint and returns
// "already booked". So we don't just look for the button — we actually try to
// book, and move on if the server rejects it.
const BLOCKED =
  /already booked|just filled up|was cancelled|already started|verify your email/i;

async function bookFirstAvailableShift(page: Page): Promise<string> {
  await page.goto("/shifts");
  const hrefs: string[] = await page
    .locator('a[href^="/shifts/"]')
    .evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((e) => (e as HTMLAnchorElement).getAttribute("href"))
            .filter((h): h is string => !!h && /^\/shifts\/[^/]+$/.test(h)),
        ),
      ),
    );

  let tried = 0;
  for (const href of hrefs) {
    await page.goto(href);
    const confirm = page.getByRole("button", { name: /Confirm booking/i });
    if (!(await confirm.isVisible().catch(() => false))) continue;
    tried++;

    await confirm.click();
    const outcome = await Promise.race([
      page
        .waitForURL(/\/me\?booked=/, { timeout: 8000 })
        .then(() => "booked" as const)
        .catch(() => null),
      page
        .getByText(BLOCKED)
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => "blocked" as const)
        .catch(() => null),
    ]);

    if (outcome === "booked") {
      const id = new URL(page.url()).searchParams.get("booked");
      if (id) return id;
    }
    // blocked (or inconclusive) — try the next shift.
  }
  throw new Error(
    `No shift could be booked from the seeded roster (${hrefs.length} shifts on /shifts, ${tried} had a booking form but were blocked)`,
  );
}

test.describe("volunteer booking", () => {
  test("books an open shift, sees confirmation, then cancels it", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const bookedShiftId = await bookFirstAvailableShift(page);
    await expect(page).toHaveURL(/\/me\?booked=/);
    await expect(page.getByText(/you.re booked/i)).toBeVisible();

    // Cleanup so the test is rerunnable against a persistent dev DB: cancel
    // from the shift detail page where the booking context is unambiguous.
    await page.goto(`/shifts/${bookedShiftId}`);
    await expect(page.getByText(/You.re booked in\./i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel shift" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel shift" }).click();

    // Back to a bookable state for this shift.
    await expect(
      page.getByRole("button", { name: /Confirm booking/i }),
    ).toBeVisible();
  });
});

test.describe("volunteer authorization", () => {
  test("a non-admin cannot reach the admin area", async ({ page }) => {
    const res = await page.goto("/admin");
    // Admin layout calls notFound() for a signed-in non-admin.
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });
});
