import { test as setup, expect, type Page } from "@playwright/test";
import path from "node:path";

// Seeded test logins (prisma/seed.ts) — password is bcrypt("fairfood").
const PASSWORD = "fairfood";
const volunteerFile = path.join(__dirname, ".auth/volunteer.json");
const adminFile = path.join(__dirname, ".auth/admin.json");

async function signInWithPassword(page: Page, email: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Seeded accounts have a completed profile, so sign-in lands on /me.
  await page.waitForURL("**/me");
  await expect(
    page.getByRole("heading", { name: /Your shifts at the kai table/i }),
  ).toBeVisible();
}

setup("authenticate as volunteer", async ({ page }) => {
  await signInWithPassword(page, "volunteer@fairfood.test");
  await page.context().storageState({ path: volunteerFile });
});

setup("authenticate as admin", async ({ page }) => {
  await signInWithPassword(page, "admin@fairfood.test");
  // Confirm the session really has admin reach before trusting the state.
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: /Today.s rosters & coming weeks/i }),
  ).toBeVisible();
  await page.context().storageState({ path: adminFile });
});
