import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
// Override PORT to run against a free port when :3000 is taken by another
// dev server (Playwright would otherwise reuse that foreign server).
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Each spec is independent; a flaky network shouldn't fail the suite outright.
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public",
      testMatch: ["public.spec.ts", "auth.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "volunteer",
      testMatch: ["volunteer.spec.ts"],
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/volunteer.json",
      },
    },
    {
      name: "admin",
      testMatch: ["admin.spec.ts"],
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
  ],

  // In CI the workflow builds, migrates and seeds first, then this just boots
  // the production server. Locally it builds+starts, or reuses an already
  // running `npm run dev` / `npm start` on :3000.
  webServer: {
    command: CI
      ? `npm run start -- -p ${PORT}`
      : `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: !CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
