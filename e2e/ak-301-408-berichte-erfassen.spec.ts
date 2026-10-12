import { expect, test, type Dialog, type Page } from "@playwright/test";
import { now } from "../src/domain/clock";
import { weeksDue } from "../src/domain/report-generation";
import { currentIsoWeek } from "../src/domain/weeks";
import { MAX_ACTIVITIES_LENGTH } from "../src/domain/report-days";
import {
  accounts,
  deletePersons,
  downloadPdf,
  insertTrainee,
  login,
  logout,
  reportIdOf,
  restoreSeedState,
  withDatabase,
} from "./helpers";

// „Jetzt“ kommt auch in den Browser-Tests aus dem Uhr-Modul – derselben Quelle wie die App.
const annaStart = new Date("2026-09-01T00:00:00Z");

/** Annas Bericht KW 39/2026 (21.–25.09.2026) dient als Arbeitswoche der Tests. */
const KW39 = { isoYear: 2026, isoWeek: 39 };

async function resetAnnasWeek39() {
  await withDatabase(async (db) => {
    await db.query(
      `UPDATE report_day SET day_type = NULL, activities = '' WHERE report_id IN (
         SELECT r.id FROM weekly_report r JOIN person p ON p.id = r.trainee_id
         WHERE p.email = $1 AND r.iso_year = $2 AND r.iso_week = $3)`,
      [accounts.anna.email, KW39.isoYear, KW39.isoWeek],
    );
  });
}

function day(page: Page, label: string) {
  return page.getByRole("group", { name: label });
}

async function openWeek39(page: Page) {
  await page.goto("/azubi/wochen");
  await page
    .getByRole("list", { name: "Wochenberichte" })
    .getByRole("link", { name: /KW 39\/2026/ })
    .click();
  await expect(page.getByRole("heading", { name: "KW 39/2026 (21.09.2026 – 25.09.2026)" })).toBeVisible();
}

test.describe("Berichte erfassen", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await restoreSeedState();
  });

  test.afterEach(async () => {
    await resetAnnasWeek39();
    await deletePersons(accounts.emil.email);
  });

  test("AK-301 AK-306 Übersicht zeigt alle Wochen seit Ausbildungsbeginn, neueste zuerst; vergangene offene hervorgehoben", async ({
    page,
  }) => {
    const expected = weeksDue({ start: annaStart, end: null }, now()).reverse();
    const current = currentIsoWeek(now());
    await login(page, accounts.anna);
    await expect(page).toHaveURL(/\/azubi$/);
    await page.goto("/azubi/wochen");

    const rows = page.getByRole("list", { name: "Wochenberichte" }).getByTestId("week-row");
    await expect(rows).toHaveCount(expected.length);
    for (const [index, week] of expected.entries()) {
      await expect(rows.nth(index)).toContainText(`KW ${week.isoWeek}/${week.isoYear}`);
      await expect(rows.nth(index)).toContainText("Entwurf");
    }
    // Zeitraum je Woche, z. B. KW 36 am Ende der Liste.
    await expect(rows.last()).toContainText("KW 36/2026");
    await expect(rows.last()).toContainText("31.08.2026 – 04.09.2026");

    // AK-306: alle vergangenen Entwürfe hervorgehoben, die aktuelle Woche nicht.
    await expect(rows.first()).toContainText(`KW ${current.isoWeek}/${current.isoYear}`);
    await expect(rows.first()).toContainText("aktuelle Woche");
    await expect(rows.first()).not.toHaveAttribute("data-past-open", "true");
    await expect(page.locator('[data-testid="week-row"][data-past-open="true"]')).toHaveCount(expected.length - 1);
    await expect(rows.last().getByText("Überfällig")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(`${expected.length - 1} vergangene Wochen sind noch offen.`);

    // Erneutes Öffnen erzeugt nichts doppelt (AK-304).
    await page.reload();
    await expect(rows).toHaveCount(expected.length);
  });

  test("AK-401 AK-402 AK-403 Bericht zeigt Mo–Fr mit Datum, genau fünf Tagesarten und „Tätigkeiten“, keine weiteren Felder", async ({
    page,
  }) => {
    await login(page, accounts.anna);
    await openWeek39(page);

    const days = page.getByTestId("report-day");
    await expect(days).toHaveCount(5);
    const labels = [
      "Montag, 21.09.2026",
      "Dienstag, 22.09.2026",
      "Mittwoch, 23.09.2026",
      "Donnerstag, 24.09.2026",
      "Freitag, 25.09.2026",
    ];
    for (const label of labels) {
      const group = day(page, label);
      await expect(group.getByLabel("Tagesart")).toBeVisible();
      await expect(group.getByLabel("Tätigkeiten")).toBeVisible();
    }
    const options = await day(page, labels[0]).getByLabel("Tagesart").locator("option").allTextContents();
    expect(options).toEqual(["Bitte wählen", "Betrieb", "Berufsschule", "Urlaub", "Krank", "Feiertag"]);

    // AK-403: keine Felder für Stunden, Abteilung oder Lernfeld.
    const form = page.getByRole("form", { name: "Bericht erfassen" });
    await expect(form.locator("input:not([type=hidden]), select, textarea")).toHaveCount(10);
    for (const forbidden of [/Stunden/i, /Abteilung/i, /Lernfeld/i]) {
      await expect(page.getByLabel(forbidden)).toHaveCount(0);
    }
  });

  test("AK-305 AK-404 AK-405 Tage vor Beginn ausgegraut, Neujahr als Feiertag vorbelegt und änderbar", async ({
    page,
  }) => {
    // Emil beginnt am Donnerstag, 01.01.2026 (Neujahr): KW 1/2026 läuft vom 29.12.2025 bis 02.01.2026.
    await insertTrainee({
      name: accounts.emil.name,
      email: accounts.emil.email,
      accountId: accounts.emil.accountId,
      trainingStart: "2026-01-01",
    });
    await login(page, accounts.emil);
    await page.goto("/azubi/wochen");
    await page
      .getByRole("list", { name: "Wochenberichte" })
      .getByRole("link", { name: /KW 1\/2026/ })
      .click();
    await expect(page.getByRole("heading", { name: "KW 1/2026 (29.12.2025 – 02.01.2026)" })).toBeVisible();

    // AK-305: Mo–Mi vor Beginn ausgegraut und gesperrt.
    for (const label of ["Montag, 29.12.2025", "Dienstag, 30.12.2025", "Mittwoch, 31.12.2025"]) {
      await expect(day(page, label)).toHaveAttribute("data-outside-training", "true");
      await expect(day(page, label)).toContainText("Außerhalb der Ausbildung – keine Angaben nötig.");
      await expect(day(page, label).getByLabel("Tagesart")).toBeDisabled();
      await expect(day(page, label).getByLabel("Tätigkeiten")).toBeDisabled();
    }
    // AK-404: Neujahr ist als „Feiertag“ vorbelegt, Freitag nicht.
    const newYear = day(page, "Donnerstag, 01.01.2026");
    await expect(newYear.getByLabel("Tagesart")).toHaveValue("HOLIDAY");
    await expect(day(page, "Freitag, 02.01.2026").getByLabel("Tagesart")).toHaveValue("");

    // AK-405: vorbelegte Tagesart ändern und speichern.
    await newYear.getByLabel("Tagesart").selectOption({ label: "Berufsschule" });
    await newYear.getByLabel("Tätigkeiten").fill("Blockunterricht Lernfeld 1");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");
    await page.reload();
    await expect(day(page, "Donnerstag, 01.01.2026").getByLabel("Tagesart")).toHaveValue("SCHOOL");
  });

  test("AK-406 AK-407 Entwurf speichern; nach Ab- und erneuter Anmeldung unverändert, inkl. Umlaute, Zeilenumbrüche, langer Text", async ({
    page,
  }) => {
    const text = "Größe der Übergabe geprüft – „Jörg“ hat ß erklärt.\n\n  Zweiter Absatz, eingerückt.\nEnde.";
    const long = `${"Lange Beschreibung mit Umlauten äöü. ".repeat(70)}Ende`; // > 2.000 Zeichen
    expect(long.length).toBeGreaterThan(2000);

    await login(page, accounts.anna);
    await openWeek39(page);
    const monday = day(page, "Montag, 21.09.2026");
    const tuesday = day(page, "Dienstag, 22.09.2026");
    await monday.getByLabel("Tagesart").selectOption({ label: "Betrieb" });
    await monday.getByLabel("Tätigkeiten").fill(text);
    await tuesday.getByLabel("Tagesart").selectOption({ label: "Berufsschule" });
    await tuesday.getByLabel("Tätigkeiten").fill(long);
    await expect(page.getByTestId("save-status")).toHaveText("Ungespeicherte Änderungen");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");

    // Abmelden und neu anmelden.
    await logout(page);
    await expect(page).toHaveURL(/\/anmelden/);
    await login(page, accounts.anna);
    await openWeek39(page);
    await expect(day(page, "Montag, 21.09.2026").getByLabel("Tagesart")).toHaveValue("WORK");
    await expect(day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten")).toHaveValue(text);
    await expect(day(page, "Dienstag, 22.09.2026").getByLabel("Tagesart")).toHaveValue("SCHOOL");
    await expect(day(page, "Dienstag, 22.09.2026").getByLabel("Tätigkeiten")).toHaveValue(long);
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");

    // Gespeichert wird exakt der Text (Zeilenumbrüche als „\n“).
    const stored = await withDatabase(
      async (db) =>
        (
          await db.query(`SELECT d.activities FROM report_day d WHERE d.report_id = $1 AND d.date = '2026-09-21'`, [
            await reportIdOf(accounts.anna.email, KW39.isoYear, KW39.isoWeek),
          ])
        ).rows[0].activities,
    );
    expect(stored).toBe(text);
  });

  test("AK-407 zu langer Text: Meldung am Feld, nichts gespeichert", async ({ page }) => {
    await login(page, accounts.anna);
    await openWeek39(page);
    const monday = day(page, "Montag, 21.09.2026");
    await monday.getByLabel("Tätigkeiten").fill("x".repeat(MAX_ACTIVITIES_LENGTH + 3));
    await expect(monday.getByText("Höchstens 5.000 Zeichen – bitte um 3 kürzen.")).toBeVisible();
    await expect(monday.getByLabel("Tätigkeiten")).toHaveAttribute("aria-invalid", "true");
    await expect(monday.getByText("5.003 / 5.000 Zeichen")).toBeVisible();

    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Nicht gespeichert – bitte die markierten Felder prüfen.")).toBeVisible();
    await page.reload();
    await expect(day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten")).toHaveValue("");
  });

  test("AK-408 Verlassen mit ungespeicherten Änderungen warnt", async ({ page }) => {
    await login(page, accounts.anna);
    await openWeek39(page);
    await day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten").fill("noch nicht gespeichert");

    // Link in der App: Rückfrage; „Abbrechen“ bleibt auf der Seite.
    const dialogs: string[] = [];
    page.once("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.getByRole("link", { name: "Zurück zu Meine Wochen" }).click();
    await expect.poll(() => dialogs.length).toBe(1);
    expect(dialogs[0]).toContain("ungespeicherte Änderungen");
    await expect(page).toHaveURL(/\/berichte\//);
    await expect(day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten")).toHaveValue("noch nicht gespeichert");

    // Auch „Abmelden“ fragt nach.
    page.once("dialog", (dialog) => dialog.dismiss());
    await logout(page);
    await expect(page).toHaveURL(/\/berichte\//);

    // Schließen oder Neuladen: Browser-Dialog „beforeunload“.
    const beforeUnload = new Promise<string>((resolve) =>
      page.once("dialog", async (dialog) => {
        resolve(dialog.type());
        await dialog.dismiss();
      }),
    );
    await page.close({ runBeforeUnload: true });
    expect(await beforeUnload).toBe("beforeunload");
  });

  test("AK-408 nach dem Speichern keine Warnung mehr", async ({ page }) => {
    await login(page, accounts.anna);
    await openWeek39(page);
    await day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten").fill("gespeichert");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");

    let dialogShown = false;
    page.on("dialog", async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });
    await page.getByRole("link", { name: "Zurück zu Meine Wochen" }).click();
    await expect(page).toHaveURL(/\/azubi\/wochen$/);
    expect(dialogShown).toBe(false);
  });

  test("AK-408 AK-901 PDF-Download mit ungespeicherten Änderungen weist auf den gespeicherten Stand hin", async ({
    page,
  }) => {
    await login(page, accounts.anna);
    await openWeek39(page);
    const montag = day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten");
    const pdfLink = page.getByRole("link", { name: "Als PDF herunterladen" });

    // Ohne ungespeicherte Änderungen: kein Hinweis, direkt der Download.
    const dialogs: string[] = [];
    const recordAndAccept = async (dialog: Dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    };
    page.on("dialog", recordAndAccept);
    const clean = await downloadPdf(page, () => pdfLink.click());
    expect(clean.fileName).toBe("Berichtsheft_Anna-Azubi_KW39-2026.pdf");
    expect(dialogs).toEqual([]);
    page.off("dialog", recordAndAccept);

    // Mit ungespeicherten Änderungen: Hinweis; „Abbrechen“ bleibt im Editor, kein Download.
    await montag.fill("noch nicht gespeichert");
    let downloads = 0;
    page.on("download", () => downloads++);
    page.once("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await pdfLink.click();
    await expect.poll(() => dialogs.length).toBe(1);
    expect(dialogs[0]).toBe("Es wird der zuletzt gespeicherte Stand exportiert.");
    await expect(page).toHaveURL(/\/berichte\//);
    await expect(montag).toHaveValue("noch nicht gespeichert");
    expect(downloads).toBe(0);

    // Bestätigen: Download des gespeicherten Stands, die Eingabe bleibt im Editor.
    page.once("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });
    const saved = await downloadPdf(page, () => pdfLink.click());
    expect(dialogs).toHaveLength(2);
    expect(saved.text).not.toContain("noch nicht gespeichert");
    await expect(montag).toHaveValue("noch nicht gespeichert");
  });

  test("AK-408 Zurück und Vor im Browser warnen bei ungespeicherten Änderungen", async ({ page }) => {
    await login(page, accounts.anna);
    await openWeek39(page);
    const monday = () => day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten");
    await monday().fill("noch nicht gespeichert");

    // Zurück: Rückfrage; „Abbrechen“ bleibt auf der Seite, die Eingabe bleibt erhalten.
    const messages: string[] = [];
    page.once("dialog", async (dialog) => {
      messages.push(dialog.message());
      await dialog.dismiss();
    });
    await page.evaluate(() => window.history.back());
    await expect.poll(() => messages.length).toBe(1);
    expect(messages[0]).toContain("ungespeicherte Änderungen");
    await expect(page).toHaveURL(/\/berichte\//);
    await expect(monday()).toHaveValue("noch nicht gespeichert");

    // Erneut zurück und bestätigen: zur Übersicht, die Änderung ist verworfen.
    page.once("dialog", (dialog) => dialog.accept());
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/\/azubi\/wochen$/);

    // Vor: wieder im Bericht, ohne die verworfene Änderung.
    await page.evaluate(() => window.history.forward());
    await expect(page).toHaveURL(/\/berichte\//);
    await expect(monday()).toHaveValue("");

    // Erneut ändern; „Vor“ führt nirgendwohin, „Zurück“ fragt wieder nach.
    await monday().fill("zweiter Versuch");
    page.once("dialog", async (dialog) => {
      messages.push(dialog.message());
      await dialog.dismiss();
    });
    await page.evaluate(() => window.history.forward());
    await page.evaluate(() => window.history.back());
    await expect.poll(() => messages.length).toBe(2);
    await expect(page).toHaveURL(/\/berichte\//);
    await expect(monday()).toHaveValue("zweiter Versuch");
  });

  test("AK-408 nach dem Speichern führt Zurück ohne Rückfrage zur Übersicht", async ({ page }) => {
    await login(page, accounts.anna);
    await openWeek39(page);
    await day(page, "Montag, 21.09.2026").getByLabel("Tätigkeiten").fill("gespeichert");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");

    let dialogShown = false;
    page.on("dialog", async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/\/azubi\/wochen$/);
    expect(dialogShown).toBe(false);
  });

  test("AK-306 Ausbilder sehen pro Azubi dieselbe Liste, nur lesend", async ({ page }) => {
    const expected = weeksDue({ start: annaStart, end: null }, now());
    await login(page, accounts.clara);
    await page
      .getByRole("list", { name: "Azubis" })
      .getByRole("link", { name: /Anna Azubi/ })
      .click();
    await expect(page.getByRole("heading", { name: "Wochenberichte von Anna Azubi" })).toBeVisible();
    const rows = page.getByRole("list", { name: "Wochenberichte" }).getByTestId("week-row");
    await expect(rows).toHaveCount(expected.length);
    await expect(page.locator('[data-testid="week-row"][data-past-open="true"]')).toHaveCount(expected.length - 1);

    await rows.filter({ hasText: "KW 40/2026" }).getByRole("link").click();
    await expect(page.getByText("Einführung in die Abteilung")).toBeVisible();
    await expect(page.getByTestId("report-editable")).toHaveText("Nur lesend.");
    await expect(page.getByRole("button", { name: "Speichern" })).toHaveCount(0);
    await expect(page.locator("select, textarea")).toHaveCount(0);
  });

  test("AK-401 Erfassen und Übersicht bei 375 px ohne horizontales Scrollen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page, accounts.anna);
    const noHorizontalScroll = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await noHorizontalScroll()).toBe(true);
    await openWeek39(page);
    await day(page, "Montag, 21.09.2026")
      .getByLabel("Tätigkeiten")
      .fill("Ein_sehr_langes_Wort_ohne_Leerzeichen_".repeat(5));
    expect(await noHorizontalScroll()).toBe(true);
    await expect(page.getByRole("button", { name: "Speichern" })).toBeInViewport();
  });
});
