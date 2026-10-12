import { expect, test } from "@playwright/test";
import { accounts, expectNoPasswordField, idpOrigin, login, loginMode, submitIdpLogin } from "./helpers";

test.describe("Anmeldung über das Firmenkonto", () => {
  test("AK-101 Anmeldung nur über das Firmenkonto, die App hat kein eigenes Passwortfeld", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/anmelden$/);
    await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
    await expect(page.getByText("ausschließlich mit Ihrem Firmenkonto")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mit Firmenkonto anmelden" })).toBeVisible();
    await expectNoPasswordField(page);

    if (loginMode === "keycloak") {
      // Das Passwort wird ausschließlich beim Identity Provider eingegeben.
      await page.getByRole("button", { name: "Mit Firmenkonto anmelden" }).click();
      await page.waitForURL((url) => url.origin === idpOrigin);
      await expect(page.locator('input[type="password"]')).toHaveCount(1);
      await submitIdpLogin(page, accounts.anna);
    } else {
      await login(page, accounts.anna);
    }

    await expect(page).toHaveURL(/\/azubi$/);
    await expect(page.getByTestId("current-person")).toHaveText("Anna Azubi · Azubi");
    await expectNoPasswordField(page);
  });

  test("AK-101 geschützte Seiten sind ohne Anmeldung nicht erreichbar", async ({ page }) => {
    for (const path of ["/", "/azubi", "/ausbilder"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/anmelden(\?ziel=[^&]+)?$/);
    }
    const session = await page.request.get("/api/auth/session");
    expect(await session.json()).toBeNull();
  });

  test("AK-101 nach der Anmeldung erscheint die Startseite der eigenen Rolle", async ({ browser }) => {
    const trainer = await browser.newPage();
    await login(trainer, accounts.bernd);
    await expect(trainer).toHaveURL(/\/ausbilder$/);
    await expect(trainer.getByRole("heading", { name: "Hallo Bernd" })).toBeVisible();
    await expect(trainer.getByRole("heading", { name: "Wochenberichte der Azubis" })).toBeVisible();
    await trainer.close();

    const trainee = await browser.newPage();
    await login(trainee, accounts.anna);
    await expect(trainee).toHaveURL(/\/azubi$/);
    await expect(trainee.getByRole("heading", { name: "Hallo Anna" })).toBeVisible();
    await expect(trainee.getByRole("heading", { name: "Zu erledigen" })).toBeVisible();
    // Die Ausbilder-Startseite bleibt für Azubis gesperrt.
    await trainee.goto("/ausbilder");
    await expect(trainee).toHaveURL(/\/azubi$/);
    await trainee.close();
  });
});
