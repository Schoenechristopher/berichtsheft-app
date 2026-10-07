import { expect, test } from "@playwright/test";
import { accounts, expectNoPasswordField, idpOrigin, login, loginMode } from "./helpers";

test.describe("Abmelden", () => {
  test("AK-106 nach dem Abmelden ist ohne erneute Anmeldung kein Zugriff möglich", async ({ page, context }) => {
    await login(page, accounts.bernd);
    await expect(page).toHaveURL(/\/ausbilder$/);

    await page.getByRole("button", { name: "Abmelden" }).click();

    await expect(page).toHaveURL(/\/anmelden\?abgemeldet=1$/);
    await expect(page.getByRole("status")).toHaveText("Sie wurden abgemeldet.");

    // Kein Sitzungs-Cookie mehr, keine Sitzung.
    const cookies = await context.cookies();
    expect(cookies.filter((cookie) => cookie.name.includes("session-token"))).toEqual([]);
    expect(await (await page.request.get("/api/auth/session")).json()).toBeNull();

    // Geschützte Seiten führen zur Anmeldung.
    for (const path of ["/", "/ausbilder", "/azubi"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/anmelden(\?ziel=[^&]+)?$/);
    }

    if (loginMode === "keycloak") {
      // Auch die Sitzung beim Identity Provider ist beendet: erneute Anmeldung verlangt das Passwort.
      await page.getByRole("button", { name: "Mit Firmenkonto anmelden" }).click();
      await page.waitForURL((url) => url.origin === idpOrigin);
      await expect(page.locator("#password")).toBeVisible();
    } else {
      await expectNoPasswordField(page);
    }
  });

  test("AK-106 nach erneuter Anmeldung ist der Zugriff wieder möglich", async ({ page }) => {
    await login(page, accounts.anna);
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/anmelden\?abgemeldet=1$/);

    await login(page, accounts.anna);
    await expect(page).toHaveURL(/\/azubi$/);
    await expect(page.getByTestId("current-person")).toHaveText("Anna Azubi · Azubi");
  });
});
