import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  accounts,
  annasSeedReportId,
  deletePersons,
  deleteReportWithoutHistory,
  downloadPdf,
  insertTrainee,
  login,
  prepareWeek,
  queryOne,
  restoreSeedState,
  type DayContent,
} from "./helpers";

/**
 * Einreichen und Prüfen (Etappe 4). Abläufe, die Historie erzeugen, laufen mit dem Testkonto Emil
 * als Azubi (Bernd zugeordnet): Historie ist unlöschbar (AK-803), Emil wird nach jedem Test samt
 * Berichten und Historie endgültig gelöscht. Annas Seed-Daten bleiben so unverändert.
 */
const emil = accounts.emil;
const KW40 = { isoYear: 2026, isoWeek: 40 };
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld beschriftet" },
  { dayType: "WORK", activities: "Switch konfiguriert" },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke" },
  { dayType: "WORK", activities: "Druckerwartung" },
  { dayType: "VACATION", activities: "" },
];

async function createEmilWithWeek40() {
  await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
  return prepareWeek(emil.email, KW40.isoYear, KW40.isoWeek, fullWeek);
}

async function newSession(browser: Browser, account: (typeof accounts)[keyof typeof accounts]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, account);
  return { context, page };
}

/** Klickt die Schaltfläche und bestätigt im Dialog. */
async function confirmAction(page: Page, button: string, dialogTitle: string, confirm = button) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: dialogTitle });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
}

async function reportStatus(reportId: string) {
  return (await queryOne<{ status: string }>("SELECT status FROM weekly_report WHERE id = $1", [reportId]))?.status;
}

function day(page: Page, label: string) {
  return page.getByRole("group", { name: label });
}

test.describe("Einreichen und Prüfen", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await restoreSeedState();
  });

  test.afterEach(async () => {
    await deletePersons(emil.email);
    await deleteReportWithoutHistory(accounts.anna.email, 2026, 52);
  });

  test("Beispielszenario: Einreichen scheitert an fehlendem Text (AK-501 AK-502)", async ({ page }) => {
    // Annas KW 52/2026: Mo–Do „Betrieb“ mit Text, Fr 25.12.2026 als „Feiertag“ vorbelegt.
    const reportId = await prepareWeek(accounts.anna.email, 2026, 52, [
      { dayType: "WORK", activities: "Server aufgesetzt" },
      { dayType: "WORK", activities: "Backup geprüft" },
      { dayType: "WORK", activities: "Tickets bearbeitet" },
      { dayType: "WORK", activities: "Inventur" },
      { dayType: "HOLIDAY", activities: "" },
    ]);
    await login(page, accounts.anna);
    await page.goto(`/berichte/${reportId}`);
    const friday = day(page, "Freitag, 25.12.2026");
    await expect(friday.getByLabel("Tagesart")).toHaveValue("HOLIDAY");

    // Anna ändert Freitag auf „Berufsschule“ und reicht ein.
    await friday.getByLabel("Tagesart").selectOption({ label: "Berufsschule" });
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();

    // Nicht eingereicht: kein Bestätigungsdialog, Freitag ist als „Tätigkeiten fehlen“ markiert.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(friday.getByTestId("day-issue")).toHaveText("Tätigkeiten fehlen");
    await expect(friday.getByLabel("Tätigkeiten")).toHaveAttribute("aria-invalid", "true");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Nicht eingereicht – bitte ergänzen: Freitag, 25.12.2026: Tätigkeiten fehlen." }),
    ).toBeVisible();
    await expect(page.getByTestId("day-issue")).toHaveCount(1);
    expect(await reportStatus(reportId)).toBe("DRAFT");

    // Die Markierung verschwindet, sobald der Text da ist.
    await friday.getByLabel("Tätigkeiten").fill("   ");
    await expect(friday.getByTestId("day-issue")).toHaveText("Tätigkeiten fehlen");
    await friday.getByLabel("Tätigkeiten").fill("Blockunterricht");
    await expect(friday.getByTestId("day-issue")).toHaveCount(0);
    expect(await reportStatus(reportId)).toBe("DRAFT");
  });

  test("AK-502 fehlende Tagesart wird am Tag markiert", async ({ page }) => {
    await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
    const reportId = await prepareWeek(emil.email, KW40.isoYear, KW40.isoWeek, [
      ...fullWeek.slice(0, 4),
      { dayType: null, activities: "" },
    ]);
    await login(page, emil);
    await page.goto(`/berichte/${reportId}`);
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();
    await expect(day(page, "Freitag, 02.10.2026").getByTestId("day-issue")).toHaveText("Tagesart fehlt");
    await expect(day(page, "Freitag, 02.10.2026").getByLabel("Tagesart")).toHaveAttribute("aria-invalid", "true");
    expect(await reportStatus(reportId)).toBe("DRAFT");
  });

  test("AK-505 AK-506 AK-601 einreichen, Prüfliste mit Filter, zurückziehen", async ({ browser }) => {
    const reportId = await createEmilWithWeek40();
    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    // Ungespeicherte Änderung wird beim Einreichen mitgespeichert.
    await day(trainee.page, "Freitag, 02.10.2026").getByLabel("Tätigkeiten").fill("Urlaub am Brückentag");
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");

    // AK-505: Status „Eingereicht“, schreibgeschützt.
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    await expect(trainee.page.getByTestId("report-editable")).toContainText("schreibgeschützt");
    await expect(trainee.page.locator("select, textarea")).toHaveCount(0);
    await expect(trainee.page.getByRole("button", { name: "Speichern" })).toHaveCount(0);
    await expect(trainee.page.getByText("Urlaub am Brückentag")).toBeVisible();

    // AK-601: Bernd (zugeordnet) sieht den Bericht in seiner Prüfliste mit Azubi, Woche, Einreichungsdatum.
    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.goto("/ausbilder/pruefliste");
    const rows = bernd.page.getByRole("list", { name: "Eingereichte Berichte" }).getByTestId("review-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Emil Neu");
    await expect(rows.first()).toContainText("KW 40/2026 · 28.09.2026 – 02.10.2026");
    await expect(rows.first()).toContainText(/eingereicht am \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/);
    await bernd.page.goto("/ausbilder");
    await expect(bernd.page.getByTestId("review-count")).toHaveText("1 Bericht Ihrer Azubis");

    // Clara (nicht zugeordnet): standardmäßig leer, per Filter „Alle Azubis“ sichtbar.
    const clara = await newSession(browser, accounts.clara);
    await clara.page.goto("/ausbilder/pruefliste");
    await expect(clara.page.getByTestId("review-queue-empty")).toBeVisible();
    await clara.page.getByRole("link", { name: "Alle Azubis" }).click();
    await expect(clara.page.getByTestId("review-row").filter({ hasText: "Emil Neu" })).toContainText("Vertretung");

    // AK-506: Emil zieht zurück → Entwurf, bearbeitbar, nicht mehr in der Prüfliste.
    await confirmAction(trainee.page, "Zurückziehen", "Bericht zurückziehen?");
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Entwurf");
    await expect(day(trainee.page, "Montag, 28.09.2026").getByLabel("Tätigkeiten")).toBeEditable();
    await bernd.page.goto("/ausbilder/pruefliste");
    await expect(bernd.page.getByTestId("review-queue-empty")).toBeVisible();

    // Historie (AK-801): Einreichen und Zurückziehen mit Person.
    const changes = trainee.page.getByTestId("history-change");
    await expect(changes).toHaveCount(2);
    await expect(changes.nth(0)).toContainText("Eingereicht von Emil Neu");
    await expect(changes.nth(1)).toContainText("Zurückgezogen von Emil Neu → Status „Entwurf“");
    for (const session of [trainee, bernd, clara]) {
      await session.context.close();
    }
  });

  test("AK-508 Zurückziehen während der Ausbilder den Bericht offen hat; umgekehrt Zurückziehen nach der Prüfung", async ({
    browser,
  }) => {
    const reportId = await createEmilWithWeek40();
    const trainee = await newSession(browser, emil);
    const bernd = await newSession(browser, accounts.bernd);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");

    // Bernd öffnet den Bericht, Emil zieht inzwischen zurück.
    await bernd.page.goto(`/berichte/${reportId}`);
    await expect(bernd.page.getByRole("button", { name: "Freigeben" })).toBeVisible();
    await confirmAction(trainee.page, "Zurückziehen", "Bericht zurückziehen?");
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Entwurf");

    await confirmAction(bernd.page, "Freigeben", "Bericht freigeben?");
    await expect(bernd.page.getByRole("alert").filter({ hasText: "Bericht wurde zurückgezogen" })).toHaveText(
      "Bericht wurde zurückgezogen",
    );
    expect(await reportStatus(reportId)).toBe("DRAFT");

    // Umgekehrt: Emil reicht erneut ein und hat die Seite offen; Bernd gibt frei; Zurückziehen scheitert.
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");
    await expect(trainee.page.getByRole("button", { name: "Zurückziehen" })).toBeVisible();
    await bernd.page.goto(`/berichte/${reportId}`);
    await confirmAction(bernd.page, "Freigeben", "Bericht freigeben?");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");

    await confirmAction(trainee.page, "Zurückziehen", "Bericht zurückziehen?");
    await expect(trainee.page.getByRole("alert").filter({ hasText: "Bericht wurde bereits geprüft" })).toHaveText(
      "Bericht wurde bereits geprüft und kann nicht mehr zurückgezogen werden.",
    );
    expect(await reportStatus(reportId)).toBe("APPROVED");
    // AK-507: Nach dem Neuladen fehlt die Schaltfläche.
    await trainee.page.reload();
    await expect(trainee.page.getByRole("button", { name: "Zurückziehen" })).toHaveCount(0);
    await trainee.context.close();
    await bernd.context.close();
  });

  test("AK-603 AK-604 AK-605 AK-606 AK-701 AK-802 ablehnen mit Kommentaren, überarbeiten, erneut einreichen, freigeben", async ({
    browser,
  }) => {
    const reportId = await createEmilWithWeek40();
    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");

    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.goto(`/berichte/${reportId}`);
    // AK-604: ohne Gesamtkommentar kein Dialog, Meldung am Feld.
    await bernd.page.getByLabel("Kommentar zu Mittwoch, 30.09.2026 (optional)").fill("Welche Themen genau?");
    await bernd.page.getByRole("button", { name: "Ablehnen", exact: true }).click();
    await expect(bernd.page.getByRole("dialog")).toHaveCount(0);
    await expect(bernd.page.getByText("Bitte einen Gesamtkommentar eingeben")).toBeVisible();
    await expect(bernd.page.getByLabel("Gesamtkommentar (Pflicht beim Ablehnen)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // AK-605: Gesamtkommentar plus optionaler Tageskommentar.
    await bernd.page.getByLabel("Gesamtkommentar (Pflicht beim Ablehnen)").fill("Bitte die Berufsschule genauer.");
    await confirmAction(bernd.page, "Ablehnen", "Bericht ablehnen?");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");

    // AK-606: Emil sieht Gesamtkommentar oben und den Tageskommentar beim Mittwoch.
    await trainee.page.reload();
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");
    await expect(trainee.page.getByTestId("review-feedback")).toContainText("Abgelehnt von Bernd Ausbilder");
    await expect(trainee.page.getByTestId("review-feedback-text")).toHaveText(
      "Gesamtkommentar: Bitte die Berufsschule genauer.",
    );
    await expect(day(trainee.page, "Mittwoch, 30.09.2026").getByTestId("day-comment")).toHaveText(
      "Kommentar des Ausbilders: Welche Themen genau?",
    );
    await expect(trainee.page.getByTestId("day-comment")).toHaveCount(1);

    // AK-701: bearbeiten und erneut einreichen → wieder in der Prüfliste.
    await day(trainee.page, "Mittwoch, 30.09.2026")
      .getByLabel("Tätigkeiten")
      .fill("Lernfeld 3: IPv4-Subnetting, VLANs");
    await confirmAction(trainee.page, "Erneut einreichen", "Bericht erneut einreichen?");
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    await bernd.page.goto("/ausbilder/pruefliste");
    await expect(bernd.page.getByTestId("review-row")).toHaveCount(1);

    // AK-603: Freigabe mit Name sowie Datum und Uhrzeit.
    await bernd.page.getByTestId("review-row").getByRole("link").click();
    await expect(bernd.page.getByText("IPv4-Subnetting")).toBeVisible();
    await confirmAction(bernd.page, "Freigeben", "Bericht freigeben?");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");
    await expect(bernd.page.getByTestId("approval-note")).toHaveText(
      /^Freigegeben von Bernd Ausbilder am \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr$/,
    );

    // AK-802: Historie nach Runden; Runde 1 mit den Kommentaren.
    await trainee.page.reload();
    const rounds = trainee.page.getByTestId("history-round");
    await expect(rounds).toHaveCount(2);
    await expect(rounds.nth(0)).toContainText("Runde 2");
    await expect(rounds.nth(0)).toContainText("Freigegeben von Bernd Ausbilder");
    await expect(rounds.nth(1)).toContainText("Runde 1");
    await expect(rounds.nth(1).getByTestId("history-comment")).toHaveText([
      "Gesamtkommentar (Bernd Ausbilder): Bitte die Berufsschule genauer.",
      "Kommentar zu Mittwoch, 30.09.2026 (Bernd Ausbilder): Welche Themen genau?",
    ]);
    // AK-803: In der Historie gibt es nichts zu bearbeiten oder zu löschen.
    await expect(
      trainee.page.getByRole("region", { name: "Verlauf" }).locator("button, input, textarea, select"),
    ).toHaveCount(0);
    await trainee.context.close();
    await bernd.context.close();
  });

  test("Beispielszenario: Vertretung nimmt Freigabe zurück (AK-703 AK-704 AK-801 AK-903 AK-905)", async ({
    browser,
  }) => {
    const reportId = await createEmilWithWeek40();
    // Emil reicht ein, Bernd gibt frei.
    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");
    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.goto(`/berichte/${reportId}`);
    await confirmAction(bernd.page, "Freigeben", "Bericht freigeben?");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");
    // AK-903: Das PDF trägt den Freigabevermerk mit Bernds Namen.
    const approvedPdf = await downloadPdf(bernd.page, () =>
      bernd.page.getByRole("link", { name: "Als PDF herunterladen" }).click(),
    );
    expect(approvedPdf.text).toMatch(/Freigegeben von Bernd Ausbilder am \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/);

    // AK-704: Freigegeben ist für den Azubi nicht änderbar.
    await trainee.page.reload();
    await expect(trainee.page.getByTestId("report-editable")).toHaveText("Freigegeben – nicht mehr änderbar.");
    await expect(trainee.page.getByRole("main").locator("select, textarea, button")).toHaveCount(0);
    await expect(
      trainee.page.getByRole("button", { name: /Einreichen|Zurückziehen|Freigabe zurücknehmen/ }),
    ).toHaveCount(0);

    // Clara (nicht zugeordnet) nimmt die Freigabe zurück – zuerst ohne Begründung.
    const clara = await newSession(browser, accounts.clara);
    await clara.page.goto(`/berichte/${reportId}`);
    await expect(clara.page.getByRole("button", { name: "Ablehnen" })).toHaveCount(0);
    await clara.page.getByRole("button", { name: "Freigabe zurücknehmen", exact: true }).click();
    await expect(clara.page.getByRole("dialog")).toHaveCount(0);
    await expect(clara.page.getByText("Bitte eine Begründung eingeben")).toBeVisible();
    await clara.page.getByLabel("Begründung für die Rücknahme").fill("Mittwoch falsches Datum");
    await confirmAction(clara.page, "Freigabe zurücknehmen", "Freigabe zurücknehmen?");

    // Dann hat der Bericht den Status „Abgelehnt“.
    await expect(clara.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");
    expect(await reportStatus(reportId)).toBe("REJECTED");
    // Und die Historie zeigt Bernds Freigabe und Claras Rücknahme mit Begründung.
    const changes = clara.page.getByTestId("history-change");
    await expect(changes.filter({ hasText: "Freigegeben von Bernd Ausbilder" })).toHaveCount(1);
    await expect(changes.filter({ hasText: "Freigabe zurückgenommen von Clara Ausbilderin" })).toContainText(
      "Begründung: Mittwoch falsches Datum",
    );

    // AK-703: Für den Azubi wieder bearbeitbar, Begründung oben.
    await trainee.page.reload();
    await expect(trainee.page.getByTestId("review-feedback")).toContainText(
      "Freigabe zurückgenommen von Clara Ausbilderin",
    );
    await expect(trainee.page.getByTestId("review-feedback-text")).toHaveText("Begründung: Mittwoch falsches Datum");
    await expect(day(trainee.page, "Mittwoch, 30.09.2026").getByLabel("Tätigkeiten")).toBeEditable();
    await expect(trainee.page.getByRole("button", { name: "Erneut einreichen" })).toBeVisible();
    // Und ein neu erzeugtes PDF enthält keinen Freigabevermerk (AK-905).
    const revokedPdf = await downloadPdf(clara.page, () =>
      clara.page.getByRole("link", { name: "Als PDF herunterladen" }).click(),
    );
    expect(revokedPdf.text).toContain("Nicht freigegeben – Status: Abgelehnt");
    expect(revokedPdf.text).not.toContain("Freigegeben von");
    // Benachrichtigung (Etappe 6) folgt später.
    for (const session of [trainee, bernd, clara]) {
      await session.context.close();
    }
  });

  test("AK-607 Entwürfe kann der Ausbilder weder freigeben noch ablehnen", async ({ page }) => {
    await login(page, accounts.bernd);
    await page.goto(`/berichte/${await annasSeedReportId()}`);
    await expect(page.getByTestId("report-status")).toHaveText("Status: Entwurf");
    await expect(page.getByRole("button", { name: /Freigeben|Ablehnen/ })).toHaveCount(0);
    await expect(page.locator("textarea, select")).toHaveCount(0);
  });

  test("AK-1102 Einreichen und Prüfen bei 375 px ohne horizontales Scrollen", async ({ browser }) => {
    const reportId = await createEmilWithWeek40();
    const noHorizontalScroll = (page: Page) =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const trainee = await newSession(browser, emil);
    await trainee.page.setViewportSize({ width: 375, height: 800 });
    await trainee.page.goto(`/berichte/${reportId}`);
    expect(await noHorizontalScroll(trainee.page)).toBe(true);
    await trainee.page.getByRole("button", { name: "Einreichen", exact: true }).click();
    await expect(trainee.page.getByRole("dialog", { name: "Bericht einreichen?" })).toBeInViewport();
    await trainee.page.getByRole("dialog").getByRole("button", { name: "Einreichen" }).click();
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");

    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.setViewportSize({ width: 375, height: 800 });
    await bernd.page.goto("/ausbilder/pruefliste");
    expect(await noHorizontalScroll(bernd.page)).toBe(true);
    await bernd.page.goto(`/berichte/${reportId}`);
    await bernd.page.getByLabel("Gesamtkommentar (Pflicht beim Ablehnen)").fill("Ein_sehr_langes_Wort_".repeat(10));
    expect(await noHorizontalScroll(bernd.page)).toBe(true);
    await trainee.context.close();
    await bernd.context.close();
  });
});
