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
const SMARTPHONE_TESTS = /ak-1102-smartphone\.spec\.ts$/;
// Eigene Projekte (nur Chromium): axe auf allen Seiten (UI-AK-16) und Screenshots der Hauptseiten.
const A11Y_TESTS = /barrierefreiheit\.spec\.ts$/;
const SCREENSHOT_TESTS = /screenshots\.spec\.ts$/;
const SPECIAL_TESTS = [SMARTPHONE_TESTS, A11Y_TESTS, SCREENSHOT_TESTS];

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
  // AK-1101: alle Tests in Chromium, Firefox und Microsoft Edge (Kanal „msedge“).
  // AK-1102: Smartphone-Breite als eigenes Projekt (375 px, Touch, mobiler Viewport).
  // In der Cloud-Sitzung ist nur Chromium installiert: dort `--project chromium --project smartphone-375`.
  projects: [
    { name: "chromium", testIgnore: SPECIAL_TESTS, use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", testIgnore: SPECIAL_TESTS, use: { ...devices["Desktop Firefox"] } },
    { name: "msedge", testIgnore: SPECIAL_TESTS, use: { ...devices["Desktop Edge"], channel: "msedge" } },
    {
      name: "smartphone-375",
      testMatch: SMARTPHONE_TESTS,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    // UI-AK-16: axe (WCAG 2.2 A/AA) auf allen Seiten, hell und dunkel, bei 1280 und 375 px.
    { name: "a11y", testMatch: A11Y_TESTS, use: { ...devices["Desktop Chrome"] } },
    // Screenshots der vier Hauptseiten (Desktop/Handy, hell/dunkel) nach `screenshots/`.
    { name: "screenshots", testMatch: SCREENSHOT_TESTS, use: { ...devices["Desktop Chrome"] } },
  ],
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
