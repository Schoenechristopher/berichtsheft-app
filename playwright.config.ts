import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * Browser-Tests gegen die laufende Demo.
 *
 * - Standard (CI): `docker compose up`, Login über Keycloak (E2E_LOGIN_MODE=keycloak).
 * - Ohne Keycloak (z. B. Cloud-Sitzung): E2E_LOGIN_MODE=test startet `next dev` mit
 *   dem Test-Login-Provider (nur außerhalb von Produktion verfügbar).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const loginMode = process.env.E2E_LOGIN_MODE ?? "keycloak";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Ein Worker: einzelne Tests ändern Daten (z. B. deaktivierte Person für AK-102).
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    loginMode === "test"
      ? {
          command: "npm run dev",
          url: `${baseURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: { AUTH_TEST_LOGIN: "true" },
        }
      : undefined,
});
