import { expect, test, type Browser, type Page } from "@playwright/test";
import { now } from "../src/domain/clock";
import { currentIsoWeek, isoWeekMonday, isoWeekOf, toDateInput, type IsoWeek } from "../src/domain/weeks";
import {
  accounts,
  deletePersons,
  insertTrainee,
  login,
  logout,
  openMenu,
  prepareWeek,
  queryOne,
  rejectReport,
  restoreSeedState,
  withDatabase,
  type DayContent,
} from "./helpers";

/**
 * UI-Akzeptanzkriterien (docs/05-ui-spezifikation.md, UI-AK-01 … UI-AK-20) im Browser. Abläufe,
 * die Daten ändern, laufen mit dem Testkonto Emil (wird nach jedem Test samt Berichten gelöscht).
 * UI-AK-13 prüft ein Unit-Test, UI-AK-16 `barrierefreiheit.spec.ts`, UI-AK-19 `feinschliff.spec.ts`.
 */
const emil = accounts.emil;
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld beschriftet" },
  { dayType: "WORK", activities: "Switch konfiguriert" },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke" },
  { dayType: "WORK", activities: "Druckerwartung" },
  { dayType: "VACATION", activities: "" },
];

const DARK_BG = "rgb(15, 20, 21)";
const LIGHT_BG = "rgb(247, 248, 248)";

/** Woche `offset` Wochen vor der aktuellen (Uhr-Modul wie in der App). */
function weekBefore(offset: number): IsoWeek {
  const current = currentIsoWeek(now());
  const monday = isoWeekMonday(current.isoYear, current.isoWeek);
  return isoWeekOf(new Date(monday.getTime() - offset * 7 * 86_400_000));
}

function mondayOf(week: IsoWeek): string {
  return toDateInput(isoWeekMonday(week.isoYear, week.isoWeek));
}

async function createEmil(trainingStart = "2026-09-01") {
  await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId, trainingStart });
}

async function newSession(
  browser: Browser,
  account: (typeof accounts)[keyof typeof accounts],
  viewport?: { width: number; height: number },
) {
  const context = await browser.newContext(viewport ? { viewport } : {});
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

/** Emil reicht die Woche über die Oberfläche ein. */
async function submitAsEmil(browser: Browser, reportId: string) {
  const session = await newSession(browser, emil);
  await session.page.goto(`/berichte/${reportId}`);
  await confirmAction(session.page, "Einreichen", "Bericht einreichen?");
  await expect(session.page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
  await session.context.close();
}

function day(page: Page, label: string) {
  return page.getByRole("group", { name: label });
}

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

async function backgroundColor(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe("UI-Akzeptanzkriterien", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await restoreSeedState();
  });

  test.afterEach(async () => {
    await deletePersons(emil.email);
  });

  test("UI-AK-01 Seitenleiste ab 1024 px, darunter Burger-Schublade; Escape schließt, Fokus zurück zum Burger-Knopf", async ({
    page,
  }) => {
    await login(page, accounts.anna);
    const nav = page.getByRole("navigation", { name: "Menü" });
    const burger = page.getByRole("button", { name: "Menü öffnen" });
    await expect(nav).toBeVisible();
    await expect(burger).toBeHidden();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(nav).toBeVisible();

    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(nav).toBeHidden();
    await burger.click();
    await expect(nav).toBeVisible();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    // Der Fokus liegt in der Schublade, der Rest der Seite ist inaktiv.
    await expect(nav.getByRole("button", { name: "Schließen" })).toBeFocused();
    await expect(page.locator("div:has(> main)")).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(burger).toBeFocused();

    // Schließen-Knopf und Auswahl eines Menüpunkts schließen die Schublade ebenfalls.
    await burger.click();
    await nav.getByRole("button", { name: "Schließen" }).click();
    await expect(nav).toBeHidden();
    await expect(burger).toBeFocused();
    await openMenu(page);
    await nav.getByRole("link", { name: "Meine Wochen" }).click();
    await expect(page).toHaveURL(/\/azubi\/wochen$/);
    await expect(nav).toBeHidden();
  });

  test("UI-AK-02 aktiver Menüpunkt mit aria-current; Azubi und Ausbilder sehen genau die Menüpunkte ihrer Rolle", async ({
    browser,
  }) => {
    const menuItems = async (page: Page, name: string) =>
      (await page.getByRole("navigation", { name }).getByRole("link").allTextContents())
        .map((text) => text.trim())
        .filter((text) => text !== "Teams-Postfach (Demo)");

    const anna = await newSession(browser, accounts.anna);
    await anna.page.goto("/azubi/wochen");
    expect(await menuItems(anna.page, "Menü")).toEqual([
      "Start",
      "Meine Wochen",
      "Benachrichtigungen",
      "Einstellungen",
    ]);
    const annaNav = anna.page.getByRole("navigation", { name: "Menü" });
    await expect(annaNav.getByRole("link", { name: "Meine Wochen" })).toHaveAttribute("aria-current", "page");
    await expect(annaNav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(anna.page.getByRole("navigation", { name: "Hauptmenü" })).toHaveCount(0);
    await anna.context.close();

    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.goto("/ausbilder/personen");
    expect(await menuItems(bernd.page, "Hauptmenü")).toEqual([
      "Start",
      "Prüfliste",
      "Azubis",
      "Personen",
      "Benachrichtigungen",
      "Einstellungen",
    ]);
    const berndNav = bernd.page.getByRole("navigation", { name: "Hauptmenü" });
    await expect(berndNav.getByRole("link", { name: "Personen" })).toHaveAttribute("aria-current", "page");
    await expect(berndNav.locator('[aria-current="page"]')).toHaveCount(1);
    await bernd.context.close();
  });

  test("UI-AK-03 Glocke zeigt ungelesene App-Benachrichtigungen, ab 100 „99+“, und nennt sie im aria-label", async ({
    page,
  }) => {
    await createEmil();
    const insert = (count: number) =>
      withDatabase((db) =>
        db.query(
          `INSERT INTO notification (id, event_key, recipient_id, channel, subject, body, link, sent_at, next_attempt_at)
           SELECT gen_random_uuid(), 'e2e:glocke:' || n, (SELECT id FROM person WHERE email = $1), 'APP',
                  'Testnachricht ' || n, 'Text', '/azubi', now(), now()
           FROM generate_series(1, $2) AS n`,
          [emil.email, count],
        ),
      );
    await insert(3);
    await login(page, emil);
    const bell = page.getByRole("banner").getByRole("button", { name: /^Benachrichtigungen/ });
    await expect(page.getByTestId("notification-count")).toHaveText("3");
    await expect(bell).toHaveAccessibleName("Benachrichtigungen, 3 ungelesen");

    await withDatabase((db) => db.query("DELETE FROM notification WHERE event_key LIKE 'e2e:glocke:%'"));
    await insert(120);
    await page.reload();
    await expect(page.getByTestId("notification-count")).toHaveText("99+");
    await expect(bell).toHaveAccessibleName("Benachrichtigungen, 120 ungelesen");

    // Die Vorschau zeigt die letzten 5 und markiert nichts als gelesen; „Alle anzeigen“ führt zur Liste.
    await bell.click();
    const preview = page.getByRole("region", { name: "Neueste Benachrichtigungen" });
    await expect(preview.getByRole("listitem")).toHaveCount(5);
    await page.keyboard.press("Escape");
    await expect(preview).toBeHidden();
    await expect(bell).toBeFocused();
    await page.reload();
    await expect(page.getByTestId("notification-count")).toHaveText("99+");

    // Am Handy führt die Glocke direkt zur Seite Benachrichtigungen.
    await page.setViewportSize({ width: 375, height: 800 });
    await page
      .getByRole("banner")
      .getByRole("link", { name: /^Benachrichtigungen/ })
      .click();
    await expect(page).toHaveURL(/\/benachrichtigungen$/);
    await expect(page.getByTestId("notification-count")).toHaveCount(0);
  });

  test("UI-AK-04 Start Azubi: aktuelle Woche mit Fortschritt und Knopf; offene Wochen davor, abgelehnte oben, sonst älteste zuerst", async ({
    page,
  }) => {
    const current = weekBefore(0);
    const [oneBack, twoBack, threeBack] = [weekBefore(1), weekBefore(2), weekBefore(3)];
    await createEmil(mondayOf(threeBack));
    await prepareWeek(emil.email, current.isoYear, current.isoWeek, [
      fullWeek[0],
      fullWeek[1],
      fullWeek[2],
      { dayType: null, activities: "" },
      { dayType: "WORK", activities: "" },
    ]);
    const rejected = await prepareWeek(emil.email, oneBack.isoYear, oneBack.isoWeek, fullWeek);
    await withDatabase((db) => db.query("UPDATE weekly_report SET status = 'REJECTED' WHERE id = $1", [rejected]));

    await login(page, emil);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hallo Emil");
    const tile = page.getByTestId("current-week");
    await expect(tile).toContainText("Diese Woche");
    await expect(tile.getByRole("heading")).toContainText(`KW ${current.isoWeek}/${current.isoYear}`);
    await expect(tile.getByTestId("week-progress")).toHaveText("3 von 5 Tagen ausgefüllt");
    await expect(tile).toContainText("Entwurf");
    await expect(tile.getByRole("link")).toHaveCount(1);
    await tile.getByRole("link", { name: /Weiter erfassen/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`KW ${current.isoWeek}/${current.isoYear}`);
    await page.goBack();

    const todo = page.getByTestId("todo-week");
    await expect(todo).toHaveCount(3);
    await expect(todo.nth(0)).toContainText(`KW ${oneBack.isoWeek}/${oneBack.isoYear}`);
    await expect(todo.nth(0)).toContainText("Abgelehnt");
    await expect(todo.nth(1)).toContainText(`KW ${threeBack.isoWeek}/${threeBack.isoYear}`);
    await expect(todo.nth(1)).toContainText("Überfällig");
    await expect(todo.nth(2)).toContainText(`KW ${twoBack.isoWeek}/${twoBack.isoYear}`);
  });

  test("UI-AK-05 ohne offene Wochen zeigt „Zu erledigen“ den Leerzustand", async ({ page }) => {
    await createEmil(mondayOf(weekBefore(0)));
    await login(page, emil);
    await expect(page.getByTestId("todo-empty")).toHaveText("Alles erledigt – keine offenen Wochen.");
    await expect(page.getByTestId("todo-week")).toHaveCount(0);
  });

  test("UI-AK-06 ab 1280 px fünf Tage nebeneinander, darunter untereinander; kein horizontales Scrollen", async ({
    page,
  }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await login(page, emil);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/berichte/${reportId}`);
    const days = page.getByTestId("report-day");
    await expect(days).toHaveCount(5);
    const wide = await days.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect()));
    expect(new Set(wide.map((box) => Math.round(box.top))).size).toBe(1);
    expect(new Set(wide.map((box) => Math.round(box.height))).size).toBe(1);
    for (let i = 1; i < wide.length; i++) {
      expect(wide[i].left).toBeGreaterThan(wide[i - 1].left);
    }
    expect(await noHorizontalScroll(page)).toBe(true);

    for (const width of [1279, 375]) {
      await page.setViewportSize({ width, height: 800 });
      const narrow = await days.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect()));
      expect(new Set(narrow.map((box) => Math.round(box.left))).size).toBe(1);
      for (let i = 1; i < narrow.length; i++) {
        expect(narrow[i].top).toBeGreaterThan(narrow[i - 1].top);
      }
      expect(await noHorizontalScroll(page)).toBe(true);
    }
  });

  test("UI-AK-07 Fußleiste zeigt ungespeicherte Änderungen, nach dem Speichern „Gespeichert“ und einen Toast", async ({
    page,
  }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await login(page, emil);
    await page.goto(`/berichte/${reportId}`);
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");
    await day(page, "Montag, 28.09.2026").getByLabel("Tätigkeiten").fill("Patchfeld neu beschriftet");
    await expect(page.getByTestId("save-status")).toHaveText("Ungespeicherte Änderungen");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");
    await expect(page.getByRole("status").filter({ hasText: "Entwurf gespeichert" })).toBeVisible();
  });

  test("UI-AK-08 Einreichen scheitert an Pflichtfeldern: Fehlerleiste mit Tagen und Sprunglinks erhält den Fokus", async ({
    page,
  }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, [
      fullWeek[0],
      fullWeek[1],
      { dayType: "SCHOOL", activities: "" },
      fullWeek[3],
      { dayType: null, activities: "" },
    ]);
    await login(page, emil);
    await page.goto(`/berichte/${reportId}`);
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const bar = page.getByTestId("submission-issues");
    await expect(bar).toHaveAttribute("role", "alert");
    await expect(bar).toContainText("2 Tage sind unvollständig: Mi, Fr");
    await expect(bar).toBeFocused();
    await expect(bar.getByRole("link")).toHaveText([
      "Mittwoch, 30.09.2026: Tätigkeiten fehlen",
      "Freitag, 02.10.2026: Tagesart fehlt",
    ]);
    await bar.getByRole("link", { name: "Freitag, 02.10.2026: Tagesart fehlt" }).click();
    await expect(day(page, "Freitag, 02.10.2026").getByLabel("Tagesart")).toBeFocused();
    expect(await queryOne("SELECT status FROM weekly_report WHERE id = $1", [reportId])).toEqual({ status: "DRAFT" });
  });

  test("UI-AK-09 Einreichen mit ungespeicherten Änderungen speichert zuerst und reicht dann ein", async ({ page }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await login(page, emil);
    await page.goto(`/berichte/${reportId}`);
    await day(page, "Donnerstag, 01.10.2026").getByLabel("Tätigkeiten").fill("Drucker im 2. OG gewartet");
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Bericht einreichen?" });
    await expect(dialog).toContainText("Ihre ungespeicherten Änderungen werden dabei gespeichert.");
    await dialog.getByRole("button", { name: "Einreichen", exact: true }).click();
    await expect(page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    expect(
      await queryOne("SELECT activities FROM report_day WHERE report_id = $1 AND date = '2026-10-01'", [reportId]),
    ).toEqual({ activities: "Drucker im 2. OG gewartet" });
  });

  test("UI-AK-10 UI-AK-11 geteilte Prüfansicht: Bericht in der Adresse, Pfeiltasten; nach der Entscheidung der nächste, zuletzt der Leerzustand", async ({
    browser,
  }) => {
    await createEmil();
    const week39 = await prepareWeek(emil.email, 2026, 39, fullWeek);
    const week40 = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await submitAsEmil(browser, week39);
    await submitAsEmil(browser, week40);

    const { context, page } = await newSession(browser, accounts.bernd, { width: 1280, height: 900 });
    await page.goto("/ausbilder/pruefliste?filter=alle");
    const list = page.getByRole("region", { name: "Prüfliste" });
    const pane = page.getByRole("region", { name: "Ausgewählter Bericht" });
    await expect(list).toBeVisible();
    await expect(pane).toBeVisible();
    const [listBox, paneBox] = [await list.boundingBox(), await pane.boundingBox()];
    expect(listBox!.x + listBox!.width).toBeLessThanOrEqual(paneBox!.x + 1);

    // UI-AK-10: Auswahl steht in der Adresse und ist direkt aufrufbar.
    await list.getByTestId("review-row").filter({ hasText: "KW 39/2026" }).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`[?&]bericht=${week39}$`));
    await expect(pane.getByRole("heading", { level: 2, name: /KW 39\/2026/ })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(new RegExp(`[?&]bericht=${week40}$`));
    await expect(pane.getByRole("heading", { level: 2, name: /KW 40\/2026/ })).toBeVisible();
    await page.goBack();
    await expect(pane.getByRole("heading", { level: 2, name: /KW 39\/2026/ })).toBeVisible();

    const direct = await context.newPage();
    await direct.goto(`/ausbilder/pruefliste?filter=alle&bericht=${week40}`);
    await expect(direct.getByRole("region", { name: "Ausgewählter Bericht" })).toContainText("KW 40/2026");
    await expect(direct.getByTestId("review-row").filter({ hasText: "KW 40/2026" })).toHaveAttribute(
      "data-selected",
      "true",
    );
    await direct.close();

    // UI-AK-11: Freigeben öffnet den nächsten Bericht, nach dem letzten der Leerzustand.
    await page.goto(`/ausbilder/pruefliste?filter=alle&bericht=${week39}`);
    await confirmAction(page, "Freigeben", "Bericht freigeben?");
    await expect(page.getByRole("status").filter({ hasText: "Bericht freigegeben" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]bericht=${week40}$`));
    await expect(pane.getByRole("heading", { level: 2, name: /KW 40\/2026/ })).toBeVisible();
    await rejectReport(page, "Bitte die Berufsschule genauer.");
    await expect(page.getByTestId("review-queue-empty")).toHaveText("Keine Berichte zur Prüfung.");
    expect(await queryOne("SELECT status FROM weekly_report WHERE id = $1", [week39])).toEqual({ status: "APPROVED" });
    expect(await queryOne("SELECT status FROM weekly_report WHERE id = $1", [week40])).toEqual({ status: "REJECTED" });
    await context.close();
  });

  test("UI-AK-12 unter 1024 px öffnet die Prüfliste die Berichtsseite mit Entscheidungsleiste und „← Prüfliste“", async ({
    browser,
  }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await submitAsEmil(browser, reportId);
    const { context, page } = await newSession(browser, accounts.bernd, { width: 1023, height: 800 });
    await page.goto("/ausbilder/pruefliste");
    await expect(page.getByRole("region", { name: "Ausgewählter Bericht" })).toBeHidden();
    await page.getByTestId("review-row").filter({ hasText: "Emil Neu" }).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/berichte/${reportId}$`));
    const bar = page.getByTestId("decision-bar");
    await expect(bar.getByRole("button", { name: "Freigeben", exact: true })).toBeVisible();
    await expect(bar.getByRole("button", { name: "Ablehnen", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Prüfliste" }).click();
    await expect(page).toHaveURL(/\/ausbilder\/pruefliste$/);
    await context.close();
  });

  test("UI-AK-14 Darstellung System/Hell/Dunkel gilt sofort, nach erneuter Anmeldung und auf einem zweiten Gerät", async ({
    browser,
  }) => {
    await createEmil();
    const { context, page } = await newSession(browser, emil);
    await page.goto("/einstellungen");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "system");
    await page.getByRole("radio", { name: "Dunkel" }).check();
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await backgroundColor(page)).toBe(DARK_BG);
    await expect(page.getByTestId("theme-saved")).toHaveText("Darstellung gespeichert.");
    expect(await queryOne("SELECT theme FROM person WHERE email = $1", [emil.email])).toEqual({ theme: "DARK" });

    // Nach Abmelden bleibt die Anmeldeseite dunkel (Cookie), nach erneuter Anmeldung gilt das Konto.
    await logout(page);
    await expect(page).toHaveURL(/\/anmelden/);
    await expect(html).toHaveAttribute("data-theme", "dark");
    await login(page, emil);
    await expect(html).toHaveAttribute("data-theme", "dark");
    await context.close();

    // Zweites Gerät ohne Cookie: Die Wahl am Konto gilt.
    const second = await newSession(browser, emil);
    await expect(second.page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await backgroundColor(second.page)).toBe(DARK_BG);
    await second.page.goto("/einstellungen");
    await second.page.getByRole("radio", { name: "Hell" }).check();
    await expect(second.page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await backgroundColor(second.page)).toBe(LIGHT_BG);
    await expect(second.page.getByTestId("theme-saved")).toHaveText("Darstellung gespeichert.");
    expect(await queryOne("SELECT theme FROM person WHERE email = $1", [emil.email])).toEqual({ theme: "LIGHT" });
    await second.context.close();
  });

  test("UI-AK-15 „System“ folgt prefers-color-scheme; der Server liefert das Farbschema schon im HTML (kein Aufblitzen)", async ({
    browser,
  }) => {
    await createEmil();
    for (const [colorScheme, expected] of [
      ["dark", DARK_BG],
      ["light", LIGHT_BG],
    ] as const) {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      await login(page, emil);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
      expect(await backgroundColor(page)).toBe(expected);
      await context.close();
    }

    // Gewählt „Dunkel“: Schon das HTML der Antwort trägt data-theme="dark", auch ohne JavaScript.
    await withDatabase((db) => db.query("UPDATE person SET theme = 'DARK' WHERE email = $1", [emil.email]));
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await login(page, emil);
    const response = await page.request.get("/azubi");
    expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/);
    const noScript = await browser.newContext({
      colorScheme: "light",
      javaScriptEnabled: false,
      storageState: await context.storageState(),
    });
    const staticPage = await noScript.newPage();
    await staticPage.goto("/azubi");
    expect(await backgroundColor(staticPage)).toBe(DARK_BG);
    await noScript.close();
    await context.close();
  });

  test("UI-AK-17 Abläufe nur mit der Tastatur: Zum Inhalt springen, erfassen, einreichen, freigeben; Fokus immer sichtbar und nie verdeckt", async ({
    browser,
  }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, [
      ...fullWeek.slice(0, 4),
      { dayType: null, activities: "" },
    ]);

    /** Tab, bis das fokussierte Element passt; prüft dabei jeden Fokus auf Sichtbarkeit. */
    async function tabTo(page: Page, matches: (text: string, id: string) => boolean, reverse = false) {
      for (let i = 0; i < 80; i++) {
        await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
        const focus = await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          if (!element || element === document.body) {
            return null;
          }
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          // Feste Kopfzeile oben, feste Leisten unten: Liegt der Fokus darunter verborgen?
          const centerX = Math.min(Math.max(box.left + box.width / 2, 0), window.innerWidth - 1);
          const centerY = Math.min(Math.max(box.top + box.height / 2, 0), window.innerHeight - 1);
          const top = document.elementFromPoint(centerX, centerY);
          return {
            text: element.textContent?.trim() ?? "",
            id: element.id,
            label: element.getAttribute("aria-label") ?? (element as HTMLInputElement).labels?.[0]?.textContent ?? "",
            outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
            covered: !!top && top !== element && !element.contains(top) && !top.contains(element),
            inViewport: box.bottom > 0 && box.top < window.innerHeight,
          };
        });
        if (!focus) {
          continue;
        }
        expect(focus.outline, `Fokus sichtbar: ${focus.text || focus.label}`).toBe(true);
        expect(focus.inViewport, `Fokus im Bild: ${focus.text || focus.label}`).toBe(true);
        expect(focus.covered, `Fokus nicht verdeckt: ${focus.text || focus.label}`).toBe(false);
        if (matches(focus.text, focus.id)) {
          return;
        }
      }
      throw new Error("Element per Tab nicht erreicht");
    }

    const trainee = await newSession(browser, emil);
    const page = trainee.page;
    await page.goto(`/berichte/${reportId}`);
    // „Zum Inhalt springen“ ist der erste Link.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Zum Inhalt springen" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();

    // Freitag per Tastatur ausfüllen: Tagesart wählen, speichern, einreichen und bestätigen.
    const friday = day(page, "Freitag, 02.10.2026");
    const fridayType = await friday.getByLabel("Tagesart").getAttribute("id");
    await tabTo(page, (_text, id) => id === fridayType);
    await page.keyboard.press("ArrowDown"); // „Betrieb“
    await expect(friday.getByLabel("Tagesart")).toHaveValue("WORK");
    await page.keyboard.press("Tab");
    await expect(friday.getByLabel("Tätigkeiten")).toBeFocused();
    await page.keyboard.type("Netzwerkschrank aufgeräumt");
    await tabTo(page, (text) => text === "Speichern");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("save-status")).toHaveText("Gespeichert");
    await tabTo(page, (text) => text.startsWith("Einreichen"));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Bericht einreichen?" })).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    await trainee.context.close();

    // Ausbilder gibt per Tastatur frei.
    const bernd = await newSession(browser, accounts.bernd);
    await bernd.page.goto(`/berichte/${reportId}`);
    await tabTo(bernd.page, (text) => text.startsWith("Freigeben"));
    await bernd.page.keyboard.press("Enter");
    await expect(bernd.page.getByRole("dialog", { name: "Bericht freigeben?" })).toBeVisible();
    await bernd.page.keyboard.press("Tab");
    await bernd.page.keyboard.press("Enter");
    await expect(bernd.page.getByTestId("report-status")).toHaveText("Status: Freigegeben");
    await bernd.context.close();
  });

  test("UI-AK-18 Dialoge mit Pflichtgrund und Zeitraum fangen den Fokus, schließen mit Escape und geben ihn zurück", async ({
    browser,
  }) => {
    await createEmil();
    const reportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    await submitAsEmil(browser, reportId);
    const { context, page } = await newSession(browser, accounts.bernd);
    await page.goto(`/berichte/${reportId}`);
    const reject = page.getByRole("button", { name: "Ablehnen", exact: true });
    await reject.click();
    const dialog = page.getByRole("dialog", { name: "Bericht ablehnen?" });
    await expect(dialog.getByLabel("Gesamtkommentar (Pflicht beim Ablehnen)")).toBeFocused();
    // Tab und Umschalt+Tab bleiben im Dialog.
    for (const key of ["Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(reject).toBeFocused();

    // Sammel-PDF (Dialog mit Von/Bis): Fokus zuerst auf „Von“, Escape gibt ihn zurück.
    await page.goto(
      `/ausbilder/azubis/${await queryOne<{ id: string }>("SELECT id FROM person WHERE email = $1", [emil.email]).then((row) => row!.id)}`,
    );
    const pdf = page.getByRole("button", { name: "Berichtsheft als PDF herunterladen" });
    await pdf.click();
    await expect(page.getByRole("dialog").getByLabel("Von")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(pdf).toBeFocused();
    await context.close();
  });

  test("UI-AK-20 Ladezustand mit Platzhaltern in Form des Inhalts (nach 300 ms); leere Listen erklären sich", async ({
    browser,
  }) => {
    await createEmil(mondayOf(weekBefore(0)));
    const { context, page } = await newSession(browser, emil);
    await page.goto("/benachrichtigungen");
    await expect(page.getByTestId("notifications-empty")).toHaveText("Keine Benachrichtigungen.");
    // Vorschau der Glocke lädt langsam: erst nach 300 ms erscheinen Platzhalter, dann der Inhalt.
    await page.route("**/api/benachrichtigungen/vorschau", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Benachrichtigungen/ })
      .click();
    const preview = page.getByRole("region", { name: "Neueste Benachrichtigungen" });
    const skeleton = preview.locator("[data-skeleton]");
    await expect(skeleton).toHaveCount(1);
    await expect(skeleton).toBeHidden();
    await expect(skeleton).toBeVisible();
    await expect(skeleton.locator("span.animate-pulse")).toHaveCount(6);
    await expect(preview).toContainText("Keine Benachrichtigungen.");
    await expect(skeleton).toHaveCount(0);
    await page.unrouteAll({ behavior: "ignoreErrors" });

    // Leerzustände: Start, Benachrichtigungen, Prüfliste.
    await page.goto("/azubi");
    await expect(page.getByTestId("todo-empty")).toHaveText("Alles erledigt – keine offenen Wochen.");
    await context.close();
    const clara = await newSession(browser, accounts.clara);
    await clara.page.goto("/ausbilder/pruefliste?filter=alle");
    await expect(clara.page.getByTestId("review-queue-empty")).toHaveText("Keine Berichte zur Prüfung.");
    await clara.context.close();
  });
});
