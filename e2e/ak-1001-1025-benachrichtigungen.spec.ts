import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  accounts,
  annasSeedReportId,
  clearMail,
  deletePersons,
  insertTrainee,
  login,
  loginOnLoginPage,
  mailText,
  mailpitUrl,
  personId,
  prepareWeek,
  queryOne,
  restoreSeedState,
  searchMail,
  withDatabase,
  type DayContent,
} from "./helpers";

/**
 * Benachrichtigungen (Etappe 6). Abläufe mit Statuswechseln laufen mit dem Testkonto Emil
 * (Azubi, Bernd zugeordnet), der nach jedem Test samt Berichten und Benachrichtigungen gelöscht
 * wird. E-Mail (Mailpit) und Teams-Postfach (Worker) nur mit vollständigem Compose-Stack
 * (E2E_MAILPIT_URL gesetzt, z. B. in CI).
 */
const emil = accounts.emil;
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld beschriftet" },
  { dayType: "WORK", activities: "Switch konfiguriert" },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke" },
  { dayType: "WORK", activities: "Druckerwartung" },
  { dayType: "VACATION", activities: "" },
];

async function createEmilWithWeek40(channels = ["EMAIL", "APP"]) {
  const { id } = await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
  await queryOne(`UPDATE person SET channels = $2::"Channel"[] WHERE id = $1`, [id, channels]);
  return prepareWeek(emil.email, 2026, 40, fullWeek);
}

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

/** Benachrichtigungen einer Person entfernen (Testvorbereitung: Zähler bei 0). */
async function clearNotifications(email: string) {
  await withDatabase((db) =>
    db.query("DELETE FROM notification WHERE recipient_id = (SELECT id FROM person WHERE email = $1)", [email]),
  );
}

function bell(page: Page) {
  return page.getByRole("link", { name: /^Benachrichtigungen/ });
}

test.describe("Benachrichtigungen", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await restoreSeedState();
  });

  test.afterEach(async () => {
    await deletePersons(emil.email);
    await restoreSeedState();
  });

  test("AK-1003 Link auf einen Bericht führt nach der Anmeldung direkt dorthin", async ({ page }) => {
    const reportId = await annasSeedReportId();
    await page.goto(`/berichte/${reportId}`);
    await expect(page).toHaveURL(/\/anmelden\?ziel=/);
    await expect(page.getByRole("status")).toContainText("Danach geht es direkt zur aufgerufenen Seite.");

    await loginOnLoginPage(page, accounts.anna);

    await expect(page).toHaveURL(new RegExp(`/berichte/${reportId}$`));
    await expect(page.getByRole("heading", { name: /KW 40\/2026/ })).toBeVisible();
  });

  test("AK-1003 fremde Adressen als Rücksprungziel werden ignoriert", async ({ page }) => {
    await page.goto("/anmelden?ziel=https://boese.example/");
    await loginOnLoginPage(page, accounts.anna);
    await expect(page).toHaveURL(/\/azubi$/);
  });

  test("AK-1001 AK-1015 Einreichen: Glocke des zugeordneten Ausbilders zählt, Öffnen markiert als gelesen", async ({
    browser,
  }) => {
    await clearNotifications(accounts.bernd.email);
    await clearNotifications(accounts.clara.email);
    const reportId = await createEmilWithWeek40();
    const bernd = await newSession(browser, accounts.bernd);
    await expect(bell(bernd.page)).toHaveAccessibleName("Benachrichtigungen");
    await expect(bernd.page.getByTestId("notification-count")).toHaveCount(0);

    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");
    await expect(trainee.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");

    // AK-1015: Zähler ungelesener App-Benachrichtigungen.
    await bernd.page.reload();
    await expect(bernd.page.getByTestId("notification-count")).toHaveText("1");
    await expect(bell(bernd.page)).toHaveAccessibleName("Benachrichtigungen: 1 ungelesen");
    // AK-1001: Clara (Vertretung) wird nicht benachrichtigt.
    const clara = await newSession(browser, accounts.clara);
    await expect(clara.page.getByTestId("notification-count")).toHaveCount(0);

    // Öffnen der Liste: „Neu“, Inhalt mit Azubi, Woche, Anlass; danach gelesen.
    await bell(bernd.page).click();
    await expect(bernd.page).toHaveURL(/\/benachrichtigungen$/);
    const item = bernd.page.getByTestId("notification").first();
    await expect(item.getByTestId("notification-new")).toHaveText("Neu");
    await expect(item.getByRole("heading")).toHaveText("Bericht eingereicht: Emil Neu, KW 40/2026");
    await expect(bernd.page.getByTestId("notification-count")).toHaveCount(0);
    await item.getByText("Nachricht anzeigen").click();
    await expect(item).toContainText("Anlass: Bericht eingereicht");
    await expect(item).toContainText("Woche: KW 40/2026 (28.09.2026 – 02.10.2026)");
    await item.getByRole("link", { name: "Zum Bericht" }).click();
    await expect(bernd.page).toHaveURL(new RegExp(`/berichte/${reportId}$`));
    await expect(bernd.page.getByTestId("notification-count")).toHaveCount(0);
    expect(
      await queryOne<{ count: string }>(
        "SELECT count(*) FROM notification WHERE recipient_id = $1 AND channel = 'APP' AND read_at IS NULL",
        [await personId(accounts.bernd.email)],
      ),
    ).toEqual({ count: "0" });

    // Erneutes Öffnen: nicht mehr „Neu“.
    await bell(bernd.page).click();
    await expect(bernd.page.getByTestId("notification")).toHaveCount(1);
    await expect(bernd.page.getByTestId("notification-new")).toHaveCount(0);
    for (const session of [trainee, bernd, clara]) {
      await session.context.close();
    }
  });

  test("AK-1011 AK-1012 Kanäle unter „Einstellungen“ frei kombinierbar, bei keinem ein deutlicher Hinweis", async ({
    page,
  }) => {
    await login(page, accounts.anna);
    await page.getByRole("navigation", { name: "Menü" }).getByRole("link", { name: "Einstellungen" }).click();
    await expect(page).toHaveURL(/\/einstellungen$/);
    // AK-1012: Voreinstellung E-Mail + App.
    await expect(page.getByRole("checkbox", { name: /E-Mail/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Teams/ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /App/ })).toBeChecked();

    // Alle abwählen: Hinweis, dass dann auch keine Erinnerungen kommen.
    await page.getByRole("checkbox", { name: /E-Mail/ }).uncheck();
    await page.getByRole("checkbox", { name: /App/ }).uncheck();
    await expect(page.getByTestId("no-channel-warning")).toContainText("auch keine Erinnerungen");
    await page.getByRole("button", { name: "Kanäle speichern" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Gespeichert. Die Kanäle gelten ab der nächsten Benachrichtigung.",
    );
    expect(await queryOne("SELECT channels FROM person WHERE email = $1", [accounts.anna.email])).toEqual({
      channels: "{}",
    });
    await page.reload();
    await expect(page.getByTestId("no-channel-warning")).toBeVisible();

    // Nur Teams.
    await page.getByRole("checkbox", { name: /Teams/ }).check();
    await expect(page.getByTestId("no-channel-warning")).toHaveCount(0);
    await page.getByRole("button", { name: "Kanäle speichern" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    expect(await queryOne("SELECT channels FROM person WHERE email = $1", [accounts.anna.email])).toEqual({
      channels: "{TEAMS}",
    });
  });

  test("AK-1011 Ausbilder stellen ihre Kanäle bei den Einstellungen ein", async ({ page }) => {
    await login(page, accounts.clara);
    await page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Einstellungen" }).click();
    await expect(page.getByRole("heading", { name: "Meine Benachrichtigungen" })).toBeVisible();
    await page.getByRole("checkbox", { name: /Teams/ }).check();
    await page.getByRole("checkbox", { name: /E-Mail/ }).uncheck();
    await page.getByRole("button", { name: "Kanäle speichern" }).click();
    await expect(page.getByText("Gespeichert. Die Kanäle gelten ab der nächsten Benachrichtigung.")).toBeVisible();
    expect(await queryOne("SELECT channels FROM person WHERE email = $1", [accounts.clara.email])).toEqual({
      channels: "{TEAMS,APP}",
    });
  });

  test("Beispielszenario: Vertretung nimmt Freigabe zurück – Benachrichtigung an den Azubi (AK-1002 AK-1013)", async ({
    browser,
  }) => {
    const reportId = await createEmilWithWeek40(["EMAIL", "TEAMS", "APP"]);
    if (mailpitUrl) {
      await clearMail(emil.email);
    }
    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");
    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.goto(`/berichte/${reportId}`);
    await confirmAction(bernd.page, "Freigeben", "Bericht freigeben?");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");

    const clara = await newSession(browser, accounts.clara);
    await clara.page.goto(`/berichte/${reportId}`);
    await clara.page.getByLabel("Begründung für die Rücknahme").fill("Mittwoch falsches Datum");
    await confirmAction(clara.page, "Freigabe zurücknehmen", "Freigabe zurücknehmen?");
    await expect(clara.page.getByTestId("report-status")).toHaveText("Status: Abgelehnt");

    // Und Emil erhält eine Benachrichtigung über seine gewählten Kanäle – in der App …
    await trainee.page.goto("/azubi");
    await expect(trainee.page.getByTestId("notification-count")).toHaveText("2");
    await bell(trainee.page).click();
    await expect(trainee.page.getByTestId("notification").first().getByRole("heading")).toHaveText(
      "Freigabe zurückgenommen: Emil Neu, KW 40/2026",
    );
    await expect(trainee.page.getByTestId("notification").nth(1).getByRole("heading")).toHaveText(
      "Bericht freigegeben: Emil Neu, KW 40/2026",
    );
    const rows = await withDatabase(
      async (db) =>
        (
          await db.query(
            `SELECT channel, subject FROM notification WHERE recipient_id = (SELECT id FROM person WHERE email = $1)
             ORDER BY subject, channel`,
            [emil.email],
          )
        ).rows,
    );
    expect(rows.map((row) => `${row.subject}|${row.channel}`)).toEqual([
      "Bericht freigegeben: Emil Neu, KW 40/2026|EMAIL",
      "Bericht freigegeben: Emil Neu, KW 40/2026|TEAMS",
      "Bericht freigegeben: Emil Neu, KW 40/2026|APP",
      "Freigabe zurückgenommen: Emil Neu, KW 40/2026|EMAIL",
      "Freigabe zurückgenommen: Emil Neu, KW 40/2026|TEAMS",
      "Freigabe zurückgenommen: Emil Neu, KW 40/2026|APP",
    ]);

    if (mailpitUrl) {
      // … per E-Mail (Mailpit, genau eine pro Ereignis, AK-1004) …
      const subject = "Freigabe zurückgenommen: Emil Neu, KW 40/2026";
      await expect
        .poll(async () => (await searchMail(`to:"${emil.email}"`)).map((mail) => mail.Subject).sort(), {
          timeout: 30_000,
        })
        .toEqual(["Bericht freigegeben: Emil Neu, KW 40/2026", subject]);
      const [mail] = (await searchMail(`to:"${emil.email}"`)).filter((message) => message.Subject === subject);
      expect(mail.To.map((to) => to.Address)).toEqual([emil.email]);
      const text = await mailText(mail.ID);
      expect(text).toContain("Clara Ausbilderin hat die Freigabe Ihres Wochenberichts KW 40/2026");
      expect(text).toContain("Azubi: Emil Neu");
      expect(text).toContain(`/berichte/${reportId}`);
      // Kein Duplikat, auch nach weiteren Worker-Durchläufen.
      await trainee.page.waitForTimeout(6_000);
      expect(await searchMail(`to:"${emil.email}" subject:"Freigabe zurückgenommen"`)).toHaveLength(1);

      // … und über Teams (Demo: Entwickler-Postfach).
      await trainee.page.goto("/entwickler-postfach");
      await expect(trainee.page.getByTestId("teams-message").filter({ hasText: subject })).toHaveCount(1);
    }
    for (const session of [trainee, bernd, clara]) {
      await session.context.close();
    }
  });

  test("AK-1001 E-Mail an den zugeordneten Ausbilder, nicht an die Vertretung (Mailpit)", async ({ browser }) => {
    test.skip(!mailpitUrl, "nur mit Mailpit (E2E_MAILPIT_URL), z. B. in CI");
    await clearMail(accounts.bernd.email);
    await clearMail(accounts.clara.email);
    const reportId = await createEmilWithWeek40();
    const trainee = await newSession(browser, emil);
    await trainee.page.goto(`/berichte/${reportId}`);
    await confirmAction(trainee.page, "Einreichen", "Bericht einreichen?");

    await expect
      .poll(async () => (await searchMail(`to:"${accounts.bernd.email}"`)).map((mail) => mail.Subject), {
        timeout: 30_000,
      })
      .toEqual(["Bericht eingereicht: Emil Neu, KW 40/2026"]);
    const [mail] = await searchMail(`to:"${accounts.bernd.email}"`);
    expect(mail.MessageID).toMatch(/^notification-[0-9a-f-]+@example\.test$/);
    const text = await mailText(mail.ID);
    expect(text).toContain("Hallo Bernd Ausbilder,");
    expect(text).toContain("Emil Neu hat den Wochenbericht KW 40/2026 (28.09.2026 – 02.10.2026) eingereicht.");
    expect(text).toContain(`Zum Bericht: http://localhost:3000/berichte/${reportId}`);
    expect(await searchMail(`to:"${accounts.clara.email}"`)).toEqual([]);
    await trainee.context.close();
  });

  test("Nicht zustellbare Nachrichten: Ausbilder sehen Liste und Zähler und versuchen erneut; Azubis nicht", async ({
    browser,
  }) => {
    const eventKey = "e2e:nicht-zustellbar";
    await withDatabase((db) =>
      db.query(
        `INSERT INTO notification (id, event_key, recipient_id, channel, subject, body, link, attempts,
           last_error, failed_at, next_attempt_at)
         VALUES (gen_random_uuid(), $1, (SELECT id FROM person WHERE email = $2), 'EMAIL',
           'Bericht eingereicht: Anna Azubi, KW 40/2026', 'Text', '/azubi', 8,
           'connect ECONNREFUSED 10.0.0.1:25', '2026-10-06T10:00:00+02:00', now())`,
        [eventKey, accounts.bernd.email],
      ),
    );
    try {
      const trainer = await newSession(browser, accounts.clara);
      const nav = trainer.page.getByRole("navigation", { name: "Hauptmenü" });
      await expect(nav.getByTestId("undeliverable-count")).toHaveText("Nicht zustellbar (1)");
      await nav.getByTestId("undeliverable-count").click();
      await expect(trainer.page.getByRole("heading", { name: "Nicht zustellbare Nachrichten" })).toBeVisible();
      const item = trainer.page.getByTestId("undeliverable");
      await expect(item).toHaveCount(1);
      await expect(item).toContainText("E-Mail");
      await expect(item).toContainText("An Bernd Ausbilder");
      await expect(item.getByTestId("undeliverable-subject")).toHaveText(
        "Anlass: Bericht eingereicht: Anna Azubi, KW 40/2026",
      );
      // Uhrzeit nicht exakt: Der Zeitstempel kommt hier per Roh-SQL, und @prisma/adapter-pg liest
      // timestamptz verschoben, wenn der Datenbank-Server nicht in UTC läuft (Compose: Europe/Berlin).
      await expect(item).toContainText(/Letzter Versuch: 06\.10\.2026, \d{2}:\d{2} Uhr · Versuche: 8/);
      await expect(item.getByTestId("undeliverable-error")).toHaveText("Fehler: connect ECONNREFUSED 10.0.0.1:25");

      await item.getByRole("button", { name: "Erneut versuchen" }).click();
      await expect(
        trainer.page.getByText("Die Nachricht wird beim nächsten Durchlauf erneut versendet."),
      ).toBeVisible();
      await expect(trainer.page.getByTestId("undeliverable")).toHaveCount(0);
      await expect(trainer.page.getByTestId("undeliverable-count")).toHaveCount(0);
      expect(await queryOne("SELECT failed_at, attempts FROM notification WHERE event_key = $1", [eventKey])).toEqual({
        failed_at: null,
        attempts: 0,
      });
      await trainer.context.close();

      // Azubis erreichen die Liste nicht, auch nicht per URL.
      const anna = await newSession(browser, accounts.anna);
      await anna.page.goto("/ausbilder/nicht-zustellbar");
      await expect(anna.page).toHaveURL(/\/azubi$/);
      await expect(anna.page.getByTestId("undeliverable-count")).toHaveCount(0);
      await anna.context.close();
    } finally {
      await withDatabase((db) => db.query("DELETE FROM notification WHERE event_key = $1", [eventKey]));
    }
  });

  test("AK-1102 Glocke, Benachrichtigungen, Einstellungen und Teams-Postfach bei 375 px ohne horizontales Scrollen", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const page = await context.newPage();
    await login(page, accounts.anna);
    for (const path of ["/azubi", "/benachrichtigungen", "/einstellungen", "/entwickler-postfach"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await expect(bell(page)).toBeVisible();
    await context.close();
  });
});
