import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  accounts,
  clearMail,
  deleteReportWithoutHistory,
  downloadPdf,
  login,
  mailpitUrl,
  personId,
  prepareWeek,
  queryOne,
  reportIdOf,
  reseedAnna,
  revokeApproval,
  runReminderJob,
  searchMail,
  withDatabase,
} from "./helpers";

/**
 * Die drei Beispielszenarien der Spezifikation, durchgehend und mit den Testkonten Anna, Bernd und
 * Clara. Die Namen stehen wörtlich wie in der Spezifikation, die AK-IDs als Tags. Statuswechsel
 * hinterlassen unlöschbare Historie (AK-803); deshalb wird Anna nach jedem Szenario per Seed neu
 * angelegt. Läuft in allen Browser-Projekten (Chromium, Firefox, Edge).
 */
const anna = accounts.anna;
const bernd = accounts.bernd;

async function newSession(browser: Browser, account: (typeof accounts)[keyof typeof accounts]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, account);
  return { context, page };
}

async function confirmAction(page: Page, button: string, dialogTitle: string) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: dialogTitle });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: button, exact: true }).click();
}

function day(page: Page, label: string) {
  return page.getByRole("group", { name: label });
}

/** Betreffe der App-Benachrichtigungen einer Person, neueste zuerst. */
async function appSubjects(email: string): Promise<string[]> {
  return withDatabase(async (db) =>
    (
      await db.query(
        `SELECT subject FROM notification WHERE recipient_id = (SELECT id FROM person WHERE email = $1)
           AND channel = 'APP' ORDER BY created_at DESC, subject`,
        [email],
      )
    ).rows.map((row) => row.subject as string),
  );
}

async function clearNotifications(...emails: string[]) {
  await withDatabase((db) =>
    db.query("DELETE FROM notification WHERE recipient_id IN (SELECT id FROM person WHERE email = ANY($1))", [emails]),
  );
}

test.describe("Beispielszenarien", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await reseedAnna();
  });

  test.afterEach(async () => {
    await deleteReportWithoutHistory(anna.email, 2026, 52);
    await reseedAnna();
  });

  test(
    "Erinnerung und Information an den Ausbilder",
    { tag: ["@AK-1021", "@AK-1022", "@AK-1024"] },
    async ({ browser }) => {
      // Angenommen Azubi "Anna" ist "Bernd" zugeordnet
      // Und Annas Bericht KW 41 (05.–09.10.2026) hat den Status "Entwurf"
      // (die Wochen davor sind freigegeben – sonst wären sie am 12.10. schon überfällig).
      await reportIdOf(anna.email, 2026, 41);
      await withDatabase((db) =>
        db.query(
          `UPDATE weekly_report SET status = 'APPROVED'
           WHERE trainee_id = (SELECT id FROM person WHERE email = $1) AND iso_year = 2026 AND iso_week < 41`,
          [anna.email],
        ),
      );
      expect(
        await queryOne("SELECT status FROM weekly_report WHERE id = $1", [await reportIdOf(anna.email, 2026, 41)]),
      ).toEqual({ status: "DRAFT" });
      await clearNotifications(anna.email, bernd.email);
      if (mailpitUrl) {
        await clearMail(anna.email);
        await clearMail(bernd.email);
      }

      // Wenn es Montag, 12.10.2026, 9:00 Uhr ist
      await runReminderJob("2026-10-12T09:00:00+02:00");
      // Dann erhält Anna eine Erinnerung für KW 41
      expect(await appSubjects(anna.email)).toEqual(["Erinnerung: Wochenbericht noch offen – KW 41/2026"]);
      const annaSession = await newSession(browser, anna);
      await expect(annaSession.page.getByTestId("notification-count")).toHaveText("1");
      await annaSession.page.getByRole("link", { name: /^Benachrichtigungen/ }).click();
      const reminder = annaSession.page.getByTestId("notification").first();
      await expect(reminder.getByRole("heading")).toHaveText("Erinnerung: Wochenbericht noch offen – KW 41/2026");
      await reminder.getByRole("link", { name: "Zum Bericht" }).click();
      await expect(annaSession.page.getByRole("heading", { name: /KW 41\/2026/ })).toBeVisible();
      // Und Bernd erhält keine Nachricht
      expect(await appSubjects(bernd.email)).toEqual([]);
      const berndSession = await newSession(browser, bernd);
      await expect(berndSession.page.getByTestId("notification-count")).toHaveCount(0);

      // Wenn der Bericht am Montag, 19.10.2026, 9:00 Uhr immer noch offen ist
      await runReminderJob("2026-10-19T09:00:00+02:00");
      // Dann erhält Anna erneut eine Erinnerung (KW 41 und die inzwischen ebenfalls offene KW 42)
      const annaSubjects = await appSubjects(anna.email);
      expect(annaSubjects).toHaveLength(2);
      expect(annaSubjects[0]).toBe("Erinnerung: Wochenberichte noch offen – KW 41/2026, KW 42/2026");
      await annaSession.page.goto("/azubi");
      await expect(annaSession.page.getByTestId("notification-count")).toHaveText("1");
      // Und Bernd wird über die offene KW 41 informiert
      expect(await appSubjects(bernd.email)).toEqual([
        "Information: Anna Azubi – Wochenbericht überfällig – KW 41/2026",
      ]);
      await berndSession.page.reload();
      await expect(berndSession.page.getByTestId("notification-count")).toHaveText("1");
      await berndSession.page.getByRole("link", { name: /^Benachrichtigungen/ }).click();
      const info = berndSession.page.getByTestId("notification").first();
      await expect(info.getByRole("heading")).toHaveText(
        "Information: Anna Azubi – Wochenbericht überfällig – KW 41/2026",
      );
      await info.getByText("Nachricht anzeigen").click();
      await expect(info).toContainText(
        "Anna Azubi hat folgenden Wochenbericht seit mehr als einer Woche nicht eingereicht:",
      );

      if (mailpitUrl) {
        // Dieselben Nachrichten per E-Mail (Mailpit).
        await expect
          .poll(async () => (await searchMail(`to:"${anna.email}"`)).map((mail) => mail.Subject).sort(), {
            timeout: 30_000,
          })
          .toEqual([
            "Erinnerung: Wochenbericht noch offen – KW 41/2026",
            "Erinnerung: Wochenberichte noch offen – KW 41/2026, KW 42/2026",
          ]);
        await expect
          .poll(async () => (await searchMail(`to:"${bernd.email}"`)).map((mail) => mail.Subject), { timeout: 30_000 })
          .toEqual(["Information: Anna Azubi – Wochenbericht überfällig – KW 41/2026"]);
      }
      await annaSession.context.close();
      await berndSession.context.close();
    },
  );

  test("Einreichen scheitert an fehlendem Text", { tag: ["@AK-404", "@AK-501", "@AK-502"] }, async ({ page }) => {
    // Angenommen Annas Bericht KW 52/2026 hat Mo–Do "Betrieb" mit Text
    // Und Freitag 25.12.2026 ist automatisch als "Feiertag" vorbelegt
    const reportId = await prepareWeek(anna.email, 2026, 52, [
      { dayType: "WORK", activities: "Server aufgesetzt" },
      { dayType: "WORK", activities: "Backup geprüft" },
      { dayType: "WORK", activities: "Tickets bearbeitet" },
      { dayType: "WORK", activities: "Inventur" },
      { dayType: "HOLIDAY", activities: "" },
    ]);
    await login(page, anna);
    await page.goto(`/berichte/${reportId}`);
    const friday = day(page, "Freitag, 25.12.2026");
    await expect(friday.getByLabel("Tagesart")).toHaveValue("HOLIDAY");

    // Wenn Anna Freitag auf "Berufsschule" ändert und einreicht
    await friday.getByLabel("Tagesart").selectOption({ label: "Berufsschule" });
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();

    // Dann wird der Bericht nicht eingereicht
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Fehlerleiste oben mit dem betroffenen Tag und Sprunglink (UI-AK-08).
    const issues = page.getByRole("alert").filter({ hasText: "1 Tag ist unvollständig: Fr" });
    await expect(issues).toBeVisible();
    await expect(issues.getByRole("link", { name: "Freitag, 25.12.2026: Tätigkeiten fehlen" })).toBeVisible();
    await expect(page.getByTestId("report-status")).toHaveText("Status: Entwurf");
    expect(await queryOne("SELECT status FROM weekly_report WHERE id = $1", [reportId])).toEqual({ status: "DRAFT" });
    // Und Freitag ist als "Tätigkeiten fehlen" markiert
    await expect(friday.getByTestId("day-issue")).toHaveText("Tätigkeiten fehlen");
    await expect(friday.getByLabel("Tätigkeiten")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("day-issue")).toHaveCount(1);
  });

  test(
    "Vertretung nimmt Freigabe zurück",
    { tag: ["@AK-602", "@AK-703", "@AK-801", "@AK-905", "@AK-1002", "@AK-1013"] },
    async ({ browser }) => {
      // Angenommen Annas Bericht KW 40 wurde von "Bernd" freigegeben
      const reportId = await reportIdOf(anna.email, 2026, 40);
      await clearNotifications(anna.email);
      if (mailpitUrl) {
        await clearMail(anna.email);
      }
      const annaSession = await newSession(browser, anna);
      await annaSession.page.goto(`/berichte/${reportId}`);
      const thursday = day(annaSession.page, "Donnerstag, 01.10.2026");
      await thursday.getByLabel("Tagesart").selectOption({ label: "Betrieb" });
      await thursday.getByLabel("Tätigkeiten").fill("Arbeitsplätze für neue Kollegen vorbereitet.");
      await day(annaSession.page, "Freitag, 02.10.2026").getByLabel("Tagesart").selectOption({ label: "Urlaub" });
      await confirmAction(annaSession.page, "Einreichen", "Bericht einreichen?");
      await expect(annaSession.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");

      const berndSession = await newSession(browser, bernd);
      await berndSession.page.goto("/ausbilder/pruefliste");
      await berndSession.page.getByTestId("review-row").filter({ hasText: "Anna Azubi" }).getByRole("link").click();
      // Geteilte Prüfansicht: nach der Freigabe Toast und der nächste Bericht (hier keiner mehr, UI-AK-11).
      await confirmAction(berndSession.page, "Freigeben", "Bericht freigeben?");
      await expect(berndSession.page.getByRole("status").filter({ hasText: "Bericht freigegeben" })).toBeVisible();
      // Erst den Sprung zum nächsten Bericht abwarten (hier: leere Liste), sonst bricht goto ihn ab.
      await expect(berndSession.page).toHaveURL(/\/ausbilder\/pruefliste$/);
      await expect(berndSession.page.getByTestId("review-queue-empty")).toBeVisible();
      await berndSession.page.goto(`/berichte/${reportId}`);
      await expect(berndSession.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");
      await expect(berndSession.page.getByTestId("approval-note")).toContainText("Freigegeben von Bernd Ausbilder");

      // Wenn Ausbilderin "Clara" (nicht zugeordnet) die Freigabe mit Begründung "Mittwoch falsches Datum" zurücknimmt
      const claraSession = await newSession(browser, accounts.clara);
      await claraSession.page.goto(`/berichte/${reportId}`);
      await revokeApproval(claraSession.page, "Mittwoch falsches Datum");

      // Dann hat der Bericht den Status "Abgelehnt"
      await expect(claraSession.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");
      expect(await queryOne("SELECT status FROM weekly_report WHERE id = $1", [reportId])).toEqual({
        status: "REJECTED",
      });

      // Und Anna erhält eine Benachrichtigung über ihre gewählten Kanäle (Voreinstellung E-Mail + App)
      const rows = await withDatabase(
        async (db) =>
          (
            await db.query(
              `SELECT channel FROM notification WHERE recipient_id = $1 AND subject = $2 ORDER BY channel`,
              [await personId(anna.email), "Freigabe zurückgenommen: Anna Azubi, KW 40/2026"],
            )
          ).rows,
      );
      expect(rows.map((row) => row.channel)).toEqual(["EMAIL", "APP"]);
      await annaSession.page.goto("/azubi");
      await expect(annaSession.page.getByTestId("notification-count")).toHaveText("2");
      await annaSession.page.getByRole("link", { name: /^Benachrichtigungen/ }).click();
      await expect(annaSession.page.getByTestId("notification").first().getByRole("heading")).toHaveText(
        "Freigabe zurückgenommen: Anna Azubi, KW 40/2026",
      );
      if (mailpitUrl) {
        await expect
          .poll(async () => (await searchMail(`to:"${anna.email}"`)).map((mail) => mail.Subject).sort(), {
            timeout: 30_000,
          })
          .toEqual(["Bericht freigegeben: Anna Azubi, KW 40/2026", "Freigabe zurückgenommen: Anna Azubi, KW 40/2026"]);
      }

      // Und die Historie zeigt Bernds Freigabe und Claras Rücknahme mit Begründung
      await annaSession.page.goto(`/berichte/${reportId}`);
      const changes = annaSession.page.getByTestId("history-change");
      await expect(changes.filter({ hasText: "Freigegeben von Bernd Ausbilder" })).toHaveCount(1);
      await expect(changes.filter({ hasText: "Freigabe zurückgenommen von Clara Ausbilderin" })).toContainText(
        "Begründung: Mittwoch falsches Datum",
      );
      await expect(annaSession.page.getByTestId("review-feedback-text")).toHaveText(
        "Begründung: Mittwoch falsches Datum",
      );

      // Und ein neu erzeugtes PDF enthält keinen Freigabevermerk
      const pdf = await downloadPdf(annaSession.page, () =>
        annaSession.page.getByRole("link", { name: "Als PDF herunterladen" }).click(),
      );
      expect(pdf.text).toContain("Nicht freigegeben – Status: Abgelehnt");
      expect(pdf.text).not.toContain("Freigegeben von");
      for (const session of [annaSession, berndSession, claraSession]) {
        await session.context.close();
      }
    },
  );
});
