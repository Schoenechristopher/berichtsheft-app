import { expect, test } from "@playwright/test";
import { accounts, annasSeedReportId, deletePersons, insertTrainee, login } from "./helpers";

const otto = { name: "Otto Fremd", email: "otto.fremd@berichtsheft.test" };

test.describe("Zugriff auf Berichte", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    await deletePersons(otto.email);
  });

  test("AK-103 Azubi sieht eigene Berichte, ein fremder Bericht ergibt „Zugriff verweigert“", async ({ page }) => {
    const { reportId: ottosReport } = await insertTrainee({ ...otto, withReport: true });
    await login(page, accounts.anna);
    await page.goto("/azubi/wochen");

    // Eigener Bericht über „Meine Wochen“; fremde Wochen erscheinen nicht.
    const weeks = page.getByRole("list", { name: "Wochenberichte" });
    await expect(weeks.getByRole("link", { name: /KW 40\/2026/ })).toHaveCount(1);
    await expect(page.locator(`a[href="/berichte/${ottosReport}"]`)).toHaveCount(0);
    await weeks.getByRole("link", { name: /KW 40\/2026/ }).click();
    await expect(page.getByRole("heading", { name: "KW 40/2026 (28.09.2026 – 02.10.2026)" })).toBeVisible();
    await expect(page.getByTestId("report-trainee")).toHaveText("Anna Azubi");
    await expect(page.getByText("Einführung in die Abteilung")).toBeVisible();

    // Fremder Bericht per direkt eingegebener Adresse.
    await page.goto(`/berichte/${ottosReport}`);
    await expect(page.getByRole("heading", { name: "Zugriff verweigert" })).toBeVisible();
    await expect(page.getByText("Otto Fremd")).toHaveCount(0);
    await expect(page.getByText("Testtätigkeit")).toHaveCount(0);
  });

  test("AK-103 unbekannte Berichte gibt es nicht", async ({ page }) => {
    await login(page, accounts.anna);
    for (const id of ["00000000-0000-4000-8000-000000000000", "kein-bericht"]) {
      await page.goto(`/berichte/${id}`);
      await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
    }
  });

  test("AK-105 jeder Ausbilder sieht die Berichte aller Azubis, auch ohne Zuordnung", async ({ browser }) => {
    const { reportId: ottosReport } = await insertTrainee({ ...otto, withReport: true });
    const annasReport = await annasSeedReportId();

    for (const trainer of [accounts.bernd, accounts.clara]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page, trainer);
      await expect(page).toHaveURL(/\/ausbilder$/);
      const list = page.getByRole("list", { name: "Azubis" });
      await expect(list.getByText("Anna Azubi")).toBeVisible();
      await expect(list.getByText("Otto Fremd")).toBeVisible();

      await page.goto(`/berichte/${annasReport}`);
      await expect(page.getByTestId("report-trainee")).toHaveText("Anna Azubi");
      await expect(page.getByText("Einführung in die Abteilung")).toBeVisible();

      await page.goto(`/berichte/${ottosReport}`);
      await expect(page.getByTestId("report-trainee")).toHaveText("Otto Fremd");
      await context.close();
    }
  });
});
