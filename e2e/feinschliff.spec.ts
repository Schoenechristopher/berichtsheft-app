import { expect, test } from "@playwright/test";
import {
  accounts,
  annasSeedReportId,
  deletePersons,
  insertTrainee,
  login,
  personId,
  prepareWeek,
  restoreSeedState,
  type DayContent,
} from "./helpers";

/** Feinschliff (Etappe 7): Seitentitel, leere Zustände und Tastaturbedienung der Dialoge. */
const emil = accounts.emil;
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld beschriftet" },
  { dayType: "WORK", activities: "Switch konfiguriert" },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke" },
  { dayType: "WORK", activities: "Druckerwartung" },
  { dayType: "VACATION", activities: "" },
];

test.describe("Feinschliff", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await restoreSeedState();
  });

  test.afterEach(async () => {
    await deletePersons(emil.email);
  });

  test("UI-AK-19 Seitentitel nennen die Seite, jede Seite hat genau eine h1", async ({ browser }) => {
    const anonymous = await browser.newPage();
    await anonymous.goto("/anmelden");
    await expect(anonymous).toHaveTitle("Anmelden – Berichtsheft");
    await anonymous.goto("/gibt-es-nicht");
    await expect(anonymous).toHaveTitle("Seite nicht gefunden – Berichtsheft");
    await anonymous.close();

    const anna = await browser.newPage();
    await login(anna, accounts.anna);
    for (const [path, title] of [
      ["/azubi", "Start"],
      ["/azubi/wochen", "Meine Wochen"],
      [`/berichte/${await annasSeedReportId()}`, "KW 40/2026"],
      ["/einstellungen", "Einstellungen"],
      ["/benachrichtigungen", "Benachrichtigungen"],
      ["/entwickler-postfach", "Teams-Postfach (Demo)"],
    ]) {
      await anna.goto(path);
      await expect(anna, path).toHaveTitle(`${title} – Berichtsheft`);
      await expect(anna.locator("h1"), path).toHaveCount(1);
    }
    await anna.close();

    const bernd = await browser.newPage();
    await login(bernd, accounts.bernd);
    const annaId = await personId(accounts.anna.email);
    for (const [path, title] of [
      ["/ausbilder", "Start"],
      ["/ausbilder/pruefliste", "Prüfliste"],
      ["/ausbilder/azubis", "Azubis"],
      [`/ausbilder/azubis/${annaId}`, "Wochenberichte eines Azubis"],
      ["/ausbilder/personen", "Personen"],
      ["/ausbilder/personen/neu", "Person anlegen"],
      [`/ausbilder/personen/${annaId}`, "Person bearbeiten"],
      ["/einstellungen", "Einstellungen"],
      ["/ausbilder/einstellungen", "Einstellungen"],
      ["/ausbilder/nicht-zustellbar", "Nicht zustellbare Nachrichten"],
    ]) {
      await bernd.goto(path);
      await expect(bernd, path).toHaveTitle(`${title} – Berichtsheft`);
      await expect(bernd.locator("h1"), path).toHaveCount(1);
    }
    await bernd.close();
  });

  test("leere Prüfliste erklärt, wo Berichte anderer Azubis stehen", async ({ page }) => {
    await login(page, accounts.clara);
    await page.goto("/ausbilder/pruefliste");
    await expect(page.getByTestId("review-queue-empty")).toHaveText(
      "Keine Berichte Ihrer Azubis zur Prüfung. Berichte anderer Azubis (Vertretung) zeigt der Filter „Alle Azubis“.",
    );
  });

  test("UI-AK-18 Bestätigungsdialog per Tastatur: Fokus auf „Abbrechen“, Escape schließt, Enter bestätigt", async ({
    page,
  }) => {
    await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
    const reportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await login(page, emil);
    await page.goto(`/berichte/${reportId}`);

    const submit = page.getByRole("button", { name: "Einreichen", exact: true });
    await submit.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Bericht einreichen?" });
    await expect(dialog).toBeVisible();
    // Sicherer Standard: Der Fokus steht zuerst auf „Abbrechen“.
    await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();

    // Escape schließt ohne Einreichen; der Fokus kehrt zur Schaltfläche zurück.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(submit).toBeFocused();
    await expect(page.getByTestId("report-status")).toHaveText("Status: Entwurf");

    // Erneut öffnen, mit Tab zu „Einreichen“ im Dialog, mit Enter bestätigen.
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Einreichen" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
  });
});
