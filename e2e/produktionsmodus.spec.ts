import { expect, test } from "@playwright/test";
import { loginMode } from "./helpers";

/**
 * Produktionsmodus: Der Compose-Stack läuft mit NODE_ENV=production; CI setzt dort zusätzlich
 * AUTH_TEST_LOGIN=true. Trotzdem darf es keinen Test-Login geben (AK-101: Anmeldung nur über das
 * Firmenkonto). Mit E2E_LOGIN_MODE=test (next dev mit Test-Login) entfällt der Test.
 * Das Entwickler-Postfach prüft `src/lib/notifications/config.test.ts`: Im Produktionsmodus gibt es
 * es nur, wenn TEAMS_MODE=entwickler-postfach ausdrücklich gesetzt ist (wie in der Demo).
 */
test.describe("Produktionsmodus", () => {
  test.skip(loginMode === "test", "nur gegen den Produktions-Build (Compose-Stack)");

  test("AK-101 im Produktionsmodus gibt es keinen Test-Login, auch nicht mit AUTH_TEST_LOGIN=true", async ({
    page,
  }) => {
    await page.goto("/anmelden");
    await expect(page.getByRole("button", { name: "Mit Firmenkonto anmelden" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Test-Login (nur Entwicklung)" })).toHaveCount(0);
    await expect(page.getByText("Test-Login")).toHaveCount(0);

    // Auth.js kennt nur den Anbieter „Firmenkonto“.
    const providers = (await (await page.request.get("/api/auth/providers")).json()) as Record<string, unknown>;
    expect(Object.keys(providers)).toEqual(["firmenkonto"]);

    // Direkter Aufruf des Test-Login-Endpunkts ergibt keine Sitzung.
    const { csrfToken } = (await (await page.request.get("/api/auth/csrf")).json()) as { csrfToken: string };
    await page.request.post("/api/auth/callback/test-login", {
      form: { csrfToken, accountId: "6f1c2a10-0b1e-4c55-9a8e-1b2c3d4e5f02" },
      maxRedirects: 0,
    });
    const session = await (await page.request.get("/api/auth/session")).json();
    expect(session).toBeNull();
    await page.goto("/ausbilder");
    await expect(page).toHaveURL(/\/anmelden/);
  });
});
