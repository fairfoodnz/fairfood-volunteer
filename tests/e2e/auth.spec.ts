import { expect, test } from "@playwright/test";

// The sign-up form renders required-field labels as "<label> *", so getByLabel
// can't match exactly — target the inputs by their stable id (= name).
test.describe("sign up", () => {
  test("rejects mismatched passwords", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.locator("#firstName").fill("Test");
    await page.locator("#lastName").fill("Volunteer");
    await page.locator("#email").fill(`e2e-mismatch-${Date.now()}@example.com`);
    await page.locator("#password").fill("password123");
    await page.locator("#confirm").fill("different123");
    await page.getByRole("button", { name: /Create account/i }).click();

    await expect(page.getByText(/Passwords don.t match/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("rejects a name that isn't in the English alphabet", async ({ page }) => {
    const email = `e2e-script-${Date.now()}@example.com`;
    await page.goto("/auth/sign-up");
    await page.locator("#firstName").fill("振莹");
    await page.locator("#lastName").fill("Tāmaki");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("supersecret1");
    await page.locator("#confirm").fill("supersecret1");
    await page.getByRole("button", { name: /Create account/i }).click();

    await expect(
      page.getByText("Please write your name using the English alphabet."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
    // The failed submit keeps what was typed (macrons are allowed, so the last
    // name raises no error of its own).
    await expect(page.locator("#firstName")).toHaveValue("振莹");
    await expect(page.locator("#lastName")).toHaveValue("Tāmaki");
    await expect(page.locator("#email")).toHaveValue(email);
  });

  test("creates an account and routes into the onboarding questionnaire", async ({
    page,
  }) => {
    const email = `e2e-signup-${Date.now()}@example.com`;
    await page.goto("/auth/sign-up");
    // Names must use the English alphabet, so no digits in test data.
    await page.locator("#firstName").fill("Eve");
    await page.locator("#lastName").fill("New Volunteer");
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

// Full WebAuthn round trip against Chromium's virtual authenticator, so a
// @simplewebauthn upgrade that breaks the ceremony fails here, not in prod.
// Uses a fresh account so the shared seeded users never gain a passkey.
test.describe("passkeys", () => {
  test("register a passkey, then sign in with it", async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    await page.goto("/auth/sign-up");
    await page.locator("#firstName").fill("Pania");
    await page.locator("#lastName").fill("Passkey");
    await page.locator("#email").fill(`e2e-passkey-${Date.now()}@example.com`);
    await page.locator("#password").fill("supersecret1");
    await page.locator("#confirm").fill("supersecret1");
    await page.getByRole("button", { name: /Create account/i }).click();
    await page.waitForURL("**/me/profile/complete");

    await page.goto("/me/security");
    await page.getByLabel("Add a passkey").fill("E2E authenticator");
    await page.getByRole("button", { name: "Add passkey" }).click();
    await expect(page.getByText("Passkey added.")).toBeVisible();
    await expect(page.getByText("E2E authenticator")).toBeVisible();
    await expect(page.getByText(/not used yet/)).toBeVisible();

    // Drop the session; the credential stays on the virtual authenticator.
    await page.context().clearCookies();
    await page.goto("/auth/sign-in");
    await page.getByRole("button", { name: "Sign in with a passkey" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"));

    await page.goto("/me/security");
    await expect(page.getByText("E2E authenticator")).toBeVisible();
    await expect(page.getByText(/last used/)).toBeVisible();
  });
});
