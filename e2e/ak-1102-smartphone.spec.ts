import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  accounts,
  annasSeedReportId,
  deletePersons,
  downloadPdf,
  insertTrainee,
  login,
  openMenu,
  personId,
  prepareWeek,
  queryOne,
  restoreSeedState,
  withDatabase,
  writeDayComment,
  type DayContent,
} from "./helpers";

/**
 * Smartphone-Breite (AK-1102): läuft nur im Projekt „smartphone-375“ (375 × 812 px, Touch,
 * mobiler Viewport; siehe playwright.config.ts). Jede Kernfunktion – erfassen, einreichen,
 * zurückziehen, prüfen, kommentieren, exportieren, Einstellungen – wird bedient, und auf jeder
 * Seite entsteht kein horizontales Scrollen. Statuswechsel laufen mit Emil (wird danach gelöscht).
 */
const emil = accounts.emil;
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld beschriftet" },
  { dayType: "WORK", activities: "Switch konfiguriert" },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke" },
  { dayType: "WORK", activities: "Druckerwartung" },
  { dayType: "VACATION", activities: "" },
];

/** Kein horizontales Scrollen: Inhalt ist nicht breiter als der Viewport. */
async function expectNoHorizontalScroll(page: Page, where = page.url()) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.viewport, "Viewport").toBe(375);
  expect(widths.document, `horizontales Scrollen auf ${where}`).toBeLessThanOrEqual(widths.client);
  expect(widths.body, `horizontales Scrollen auf ${where}`).toBeLessThanOrEqual(widths.client);
}

async function newSession(browser: Browser, account: (typeof accounts)[keyof typeof accounts]) {
  // Neue Kontexte erben die Geräte-Einstellungen des Projekts (375 px, Touch).
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, account);
  return { context, page };
}

async function confirmAction(page: Page, button: string, dialogTitle: string) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: dialogTitle });
  await expect(dialog).toBeInViewport();
  await expectNoHorizontalScroll(page, `Dialog „${dialogTitle}“`);
  await dialog.getByRole("button", { name: button, exact: true }).click();
}

function day(page: Page, label: string) {
  return page.getByRole("group", { name: label });
}

async function createEmilWithWeek40() {
  await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
  return prepareWeek(emil.email, 2026, 40, fullWeek);
}

test.describe("Smartphone-Breite 375 px", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await restoreSeedState();
  });

  test.afterEach(async () => {
    await deletePersons(emil.email);
    await restoreSeedState();
  });

  test("AK-1102 erfassen: Tagesart und Tätigkeiten eingeben und speichern", async ({ page }) => {
    const reportId = await createEmilWithWeek40();
    await withDatabase((db) =>
      db.query(`UPDATE report_day SET day_type = NULL, activities = '' WHERE report_id = $1 AND date = '2026-10-01'`, [
        reportId,
      ]),
    );
    await login(page, emil);
    await expectNoHorizontalScroll(page, "Start");
    await page.goto("/azubi/wochen");
    await expectNoHorizontalScroll(page, "Meine Wochen");
    await page.getByTestId("week-row").filter({ hasText: "KW 40/2026" }).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/berichte/${reportId}$`));
    await expectNoHorizontalScroll(page, "Bericht");

    const thursday = day(page, "Donnerstag, 01.10.2026");
    await thursday.getByLabel("Tagesart").selectOption({ label: "Betrieb" });
    // Langer Text ohne Leerzeichen darf das Feld nicht verbreitern.
    await thursday.getByLabel("Tätigkeiten").fill(`Netzwerkdokumentation ${"Ü".repeat(120)} aktualisiert`);
    await expectNoHorizontalScroll(page, "Bericht mit langem Text");
    const save = page.getByRole("button", { name: "Speichern" });
    await expect(save).toBeInViewport();
    await save.click();
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");
    expect(
      await queryOne("SELECT day_type FROM report_day WHERE report_id = $1 AND date = '2026-10-01'", [reportId]),
    ).toEqual({ day_type: "WORK" });
  });

  test("AK-1102 einreichen und zurückziehen", async ({ page }) => {
    const reportId = await createEmilWithWeek40();
    await login(page, emil);
    await page.goto(`/berichte/${reportId}`);
    await confirmAction(page, "Einreichen", "Bericht einreichen?");
    await expect(page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    await expectNoHorizontalScroll(page, "eingereichter Bericht");

    await confirmAction(page, "Zurückziehen", "Bericht zurückziehen?");
    await expect(page.getByTestId("report-status")).toHaveText("Status: Entwurf");
    await expectNoHorizontalScroll(page, "zurückgezogener Bericht");
    await expect(day(page, "Montag, 28.09.2026").getByLabel("Tätigkeiten")).toBeEditable();
  });

  test("AK-1102 prüfen und kommentieren: Prüfliste, Ablehnen mit Tageskommentar, Freigeben, Rücknahme", async ({
    browser,
  }) => {
    const reportId = await createEmilWithWeek40();
    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");

    const bernd = await newSession(browser, accounts.bernd);
    await expectNoHorizontalScroll(bernd.page, "Start (Ausbilder)");
    await openMenu(bernd.page);
    await bernd.page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Prüfliste" }).click();
    await expectNoHorizontalScroll(bernd.page, "Prüfliste");
    await bernd.page.getByTestId("review-row").filter({ hasText: "Emil Neu" }).getByRole("link").click();
    await expect(bernd.page).toHaveURL(new RegExp(`/berichte/${reportId}$`));
    await expectNoHorizontalScroll(bernd.page, "Bericht prüfen");

    // Kommentieren: Tageskommentar und Gesamtkommentar (im Dialog), auch mit sehr langen Wörtern.
    await writeDayComment(
      bernd.page,
      "Mittwoch, 30.09.2026",
      `Welche Themen genau? ${"Subnetzmaskenberechnung".repeat(5)}`,
    );
    await expectNoHorizontalScroll(bernd.page, "Kommentare");
    await bernd.page.getByRole("button", { name: "Ablehnen", exact: true }).click();
    const rejectDialog = bernd.page.getByRole("dialog", { name: "Bericht ablehnen?" });
    await expect(rejectDialog).toBeInViewport();
    await rejectDialog.getByLabel("Gesamtkommentar (Pflicht beim Ablehnen)").fill("Bitte die Berufsschule genauer.");
    await expectNoHorizontalScroll(bernd.page, "Dialog „Bericht ablehnen?“");
    await rejectDialog.getByRole("button", { name: "Ablehnen", exact: true }).click();
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");

    // Der Azubi sieht die Kommentare beim Tag, überarbeitet und reicht erneut ein.
    await trainee.page.reload();
    await expect(day(trainee.page, "Mittwoch, 30.09.2026").getByTestId("day-comment")).toContainText(
      "Welche Themen genau?",
    );
    await expectNoHorizontalScroll(trainee.page, "abgelehnter Bericht mit Kommentaren");
    await day(trainee.page, "Mittwoch, 30.09.2026").getByLabel("Tätigkeiten").fill("Lernfeld 3: IPv4-Subnetting");
    await confirmAction(trainee.page, "Erneut einreichen", "Bericht erneut einreichen?");
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");

    await bernd.page.reload();
    await confirmAction(bernd.page, "Freigeben", "Bericht freigeben?");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");
    await expectNoHorizontalScroll(bernd.page, "freigegebener Bericht mit Historie");

    await bernd.page.getByRole("button", { name: "Freigabe zurücknehmen", exact: true }).click();
    const revokeDialog = bernd.page.getByRole("dialog", { name: "Freigabe zurücknehmen?" });
    await expect(revokeDialog).toBeInViewport();
    await revokeDialog.getByLabel("Begründung für die Rücknahme").fill("Mittwoch falsches Datum");
    await expectNoHorizontalScroll(bernd.page, "Dialog „Freigabe zurücknehmen?“");
    await revokeDialog.getByRole("button", { name: "Freigabe zurücknehmen", exact: true }).click();
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");
    await expectNoHorizontalScroll(bernd.page, "zurückgenommene Freigabe");
    await trainee.context.close();
    await bernd.context.close();
  });

  test("AK-1102 exportieren: Woche und Zeitraum als PDF", async ({ page }) => {
    await login(page, accounts.anna);
    await page.goto("/azubi/wochen");
    const range = page.getByText("Berichtsheft als PDF herunterladen");
    await range.click();
    await expectNoHorizontalScroll(page, "Übersicht mit Zeitraum-Export");
    const rangePdf = await downloadPdf(page, () =>
      page.getByRole("button", { name: "Zeitraum als PDF herunterladen" }).click(),
    );
    expect(rangePdf.text).toContain("Anna Azubi");

    await page.goto(`/berichte/${await annasSeedReportId()}`);
    const weekPdf = await downloadPdf(page, () => page.getByRole("link", { name: "Als PDF herunterladen" }).click());
    expect(weekPdf.text).toContain("KW 40/2026");
  });

  test("AK-1102 Einstellungen: Kanäle (Azubi), Bundesland und Kanäle (Ausbilder)", async ({ browser }) => {
    const anna = await newSession(browser, accounts.anna);
    await openMenu(anna.page);
    await anna.page.getByRole("navigation", { name: "Menü" }).getByRole("link", { name: "Einstellungen" }).click();
    await expectNoHorizontalScroll(anna.page, "Einstellungen (Azubi)");
    await anna.page.getByRole("switch", { name: /Teams/ }).check();
    await anna.page.getByRole("button", { name: "Kanäle speichern" }).click();
    await expect(anna.page.getByRole("status")).toHaveText(
      "Gespeichert. Die Kanäle gelten ab der nächsten Benachrichtigung.",
    );
    expect(await queryOne("SELECT channels FROM person WHERE email = $1", [accounts.anna.email])).toEqual({
      channels: "{EMAIL,TEAMS,APP}",
    });

    const clara = await newSession(browser, accounts.clara);
    await openMenu(clara.page);
    await clara.page
      .getByRole("navigation", { name: "Hauptmenü" })
      .getByRole("link", { name: "Einstellungen" })
      .click();
    await expectNoHorizontalScroll(clara.page, "Einstellungen (Ausbilder)");
    await clara.page.getByLabel("Bundesland der Firma").selectOption({ label: "Niedersachsen" });
    await clara.page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(clara.page.getByText("Gespeichert: Bundesland Niedersachsen.")).toBeVisible();
    await expectNoHorizontalScroll(clara.page, "Einstellungen gespeichert");
    await anna.context.close();
    await clara.context.close();
  });

  test("AK-1102 übrige Seiten: Übersicht, Prüfliste, Nutzerverwaltung, Benachrichtigungen, Nicht zustellbar", async ({
    browser,
  }) => {
    const eventKey = "e2e:smartphone-nicht-zustellbar";
    await withDatabase((db) =>
      db.query(
        `INSERT INTO notification (id, event_key, recipient_id, channel, subject, body, link, attempts,
           last_error, failed_at, next_attempt_at)
         VALUES (gen_random_uuid(), $1, (SELECT id FROM person WHERE email = $2), 'EMAIL',
           'Bericht eingereicht: Anna Azubi, KW 40/2026', 'Text', '/azubi', 8,
           $3, now(), now())`,
        [eventKey, accounts.bernd.email, `getaddrinfo ENOTFOUND ${"sehr-langer-hostname.".repeat(8)}example`],
      ),
    );
    try {
      // Azubi: Übersicht, Bericht, Benachrichtigungen, Teams-Postfach (Demo).
      const anna = await newSession(browser, accounts.anna);
      for (const path of [
        "/azubi",
        "/azubi/wochen",
        `/berichte/${await annasSeedReportId()}`,
        "/einstellungen",
        "/benachrichtigungen",
        "/entwickler-postfach",
      ]) {
        await anna.page.goto(path);
        await expectNoHorizontalScroll(anna.page, path);
      }
      await anna.context.close();

      // Ausbilder: Start, Wochen eines Azubis, Prüfliste (beide Filter), Personen, Person anlegen und
      // bearbeiten (mit Fehlermeldung am Feld), Benachrichtigungen, Nicht zustellbar.
      const bernd = await newSession(browser, accounts.bernd);
      const annaId = await personId(accounts.anna.email);
      for (const path of [
        "/ausbilder",
        "/ausbilder/azubis",
        `/ausbilder/azubis/${annaId}`,
        "/ausbilder/pruefliste",
        "/ausbilder/pruefliste?filter=alle",
        "/ausbilder/personen",
        `/ausbilder/personen/${annaId}`,
        "/benachrichtigungen",
      ]) {
        await bernd.page.goto(path);
        await expectNoHorizontalScroll(bernd.page, path);
      }

      await bernd.page.goto("/ausbilder/personen/neu");
      await bernd.page.getByLabel("Name").fill("Emil Neu");
      await bernd.page.getByLabel("Firmen-E-Mail").fill(emil.email);
      await bernd.page.getByLabel("Rolle").selectOption("TRAINEE");
      await bernd.page.getByRole("button", { name: "Person anlegen" }).click();
      await expect(bernd.page.getByLabel("Zugeordneter Ausbilder")).toHaveAttribute("aria-invalid", "true");
      await expectNoHorizontalScroll(bernd.page, "Person anlegen mit Fehlermeldungen");

      await openMenu(bernd.page);
      const nav = bernd.page.getByRole("navigation", { name: "Hauptmenü" });
      await nav.getByTestId("undeliverable-count").click();
      await expect(bernd.page.getByTestId("undeliverable")).toHaveCount(1);
      await expectNoHorizontalScroll(bernd.page, "Nicht zustellbar");
      await expect(bernd.page.getByRole("button", { name: "Erneut versuchen" })).toBeInViewport({ ratio: 0.5 });
      await bernd.context.close();
    } finally {
      await withDatabase((db) => db.query("DELETE FROM notification WHERE event_key = $1", [eventKey]));
    }
  });

  test("AK-1102 Anmelden und „Kein Zugang“", async ({ page }) => {
    await page.goto("/anmelden");
    await expectNoHorizontalScroll(page, "Anmelden");
    await login(page, accounts.dora);
    await expect(page.getByRole("heading", { name: "Kein Zugang – bitte an den Ausbilder wenden" })).toBeVisible();
    await expectNoHorizontalScroll(page, "Kein Zugang");
  });
});
