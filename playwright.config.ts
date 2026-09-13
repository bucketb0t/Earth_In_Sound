import { defineConfig, devices } from "@playwright/test";

const E2E_BASE_URL = "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  /* One worker keeps the shared test server and disposable database ordered. */
  workers: 1,

  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],

  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run test:e2e:server",
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
