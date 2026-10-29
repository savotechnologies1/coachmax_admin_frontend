import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";

const bundledBrowsers = path.resolve(process.cwd(), "../.test-browsers");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(bundledBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = bundledBrowsers;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "test-results/browser-report", open: "never" }]],
  outputDir: "test-results/browser-artifacts",
  use: { baseURL: "http://127.0.0.1:4400", viewport: { width: 1440, height: 1050 }, locale: "en-US", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "chromium-sydney", use: { browserName: "chromium", timezoneId: "Australia/Sydney" } },
    { name: "chromium-los-angeles", use: { browserName: "chromium", timezoneId: "America/Los_Angeles" } },
  ],
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4400 --strictPort",
    url: "http://127.0.0.1:4400",
    reuseExistingServer: false,
    timeout: 60000,
    env: { VITE_API_BASE_URL: "http://127.0.0.1:4401", VITE_SOCKET_URL: "http://127.0.0.1:4401", VITE_APP_TIMEZONE: "Australia/Sydney" },
  },
});
