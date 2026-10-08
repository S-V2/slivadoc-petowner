import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Compiling the first app route in the dev server is shared by every worker.
  // Avoid a CPU-sized burst of browsers starving that compile on local audits.
  workers: process.env.CI ? 1 : 2,
  timeout: 30_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    hasTouch: true,
    isMobile: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
