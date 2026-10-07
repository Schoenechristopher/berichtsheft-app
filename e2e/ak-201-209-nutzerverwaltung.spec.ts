import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  accounts,
  deletePersons,
  insertTrainee,
  login,
  personId,
  queryOne,
  restoreSeedState,
  withDatabase,
  type TestAccount,
} from "./helpers";

const NO_ACCESS = "Kein Zugang – bitte an den Ausbilder wenden";
const otto = { name: "Otto Löschbar", email: "otto.loeschbar@berichtsheft.test" };
const fritz = { name: "Fritz Historie", email: "fritz.historie@berichtsheft.test" };
const ohne = { name: "Olga Ohnezuordnung", email: "olga@berichtsheft.test" };

async function loginIn(browser: Browser, account: TestAccount): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, account);
  return page;
}

/** Karte einer Person in der Liste der Nutzerverwaltung. */
function personRow(page: Page, name: string) {
  return page.getByTestId("person-row").filter({ has: page.getByText(name, { exact: true }) });
}

test.describe("Nutzerverwaltung", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    await deletePersons(accounts.emil.email, otto.email, ohne.email, fritz.email);
    await restoreSeedState();
  });

  test("AK-201 Admin legt Person über die Firmen-E-Mail an; erster Login ordnet das Konto zu", async ({ browser }) => {
    const bernd = await loginIn(browser, accounts.bernd);
    await bernd.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Personen" }).click();
    await bernd.getByRole("link", { name: "Person anlegen" }).click();

    await bernd.getByLabel("Name").fill("Emil Neu");
    // Andere Schreibweise als im Firmenkonto: Abgleich ohne Groß-/Kleinschreibung.
    await bernd.getByLabel("Firmen-E-Mail").fill("Emil@Berichtsheft.TEST");
    await bernd.getByLabel("Rolle").selectOption("TRAINEE");
    await bernd.getByLabel("Zugeordneter Ausbilder").selectOption({ label: "Bernd Ausbilder" });
    await bernd.getByLabel("Ausbildungsbeginn").fill("2026-10-01");
    await bernd.getByRole("button", { name: "Person anlegen" }).click();

    await expect(bernd.getByRole("heading", { name: "Emil Neu" })).toBeVisible();
    await expect(bernd.getByRole("status")).toContainText("Person angelegt");
    await expect(bernd.getByText("noch nie angemeldet")).toBeVisible();
    expect(await queryOne("SELECT account_id, email FROM person WHERE name = 'Emil Neu'")).toEqual({
      account_id: null,
      email: "emil@berichtsheft.test",
    });

    // Erster Login von Emil: Zuordnung über die bestätigte E-Mail, Konto-ID wird gespeichert.
    const emil = await loginIn(browser, accounts.emil);
    await expect(emil).toHaveURL(/\/azubi$/);
    await expect(emil.getByTestId("current-person")).toHaveText("Emil Neu · Azubi");
    expect(await queryOne("SELECT account_id FROM person WHERE name = 'Emil Neu'")).toEqual({
      account_id: accounts.emil.accountId,
    });

    await bernd.goto("/ausbilder/personen");
    const row = personRow(bernd, "Emil Neu");
    await expect(row).toContainText("Azubi");
    await expect(row).toContainText("aktiv");
    await expect(row).toContainText("Bernd Ausbilder");
    await expect(row).toContainText("01.10.2026 – offen");
    await expect(row).not.toContainText("noch nie angemeldet");
  });

  test("AK-201 Liste zeigt Rolle, Status, zugeordneten Ausbilder und Ausbildungszeitraum", async ({ page }) => {
    await login(page, accounts.bernd);
    await page.goto("/ausbilder/personen");

    const anna = personRow(page, "Anna Azubi");
    await expect(anna).toContainText("Azubi");
    await expect(anna).toContainText("aktiv");
    await expect(anna).toContainText("Bernd Ausbilder");
    await expect(anna).toContainText("01.09.2026 – offen");
    await expect(personRow(page, "Clara Ausbilderin")).toContainText("Ausbilder");
  });

  test("AK-202 Azubi ohne Ausbilder und Ausbildungsbeginn wird nicht gespeichert; Meldung am Feld", async ({
    page,
  }) => {
    await login(page, accounts.bernd);
    await page.goto("/ausbilder/personen/neu");
    await page.getByLabel("Name").fill(ohne.name);
    await page.getByLabel("Firmen-E-Mail").fill(ohne.email);
    await page.getByLabel("Rolle").selectOption("TRAINEE");
    await page.getByRole("button", { name: "Person anlegen" }).click();

    await expect(page.locator("#trainerId-error")).toHaveText("Zugeordneter Ausbilder fehlt.");
    await expect(page.locator("#trainingStart-error")).toHaveText("Ausbildungsbeginn fehlt.");
    await expect(page.getByLabel("Zugeordneter Ausbilder")).toHaveAttribute("aria-invalid", "true");
    // Eingaben bleiben erhalten.
    await expect(page.getByLabel("Name")).toHaveValue(ohne.name);
    expect(await queryOne("SELECT id FROM person WHERE email = $1", [ohne.email])).toBeNull();

    // Nur der Beginn fehlt: nur dieses Feld wird genannt.
    await page.getByLabel("Zugeordneter Ausbilder").selectOption({ label: "Clara Ausbilderin" });
    await page.getByRole("button", { name: "Person anlegen" }).click();
    await expect(page.locator("#trainingStart-error")).toHaveText("Ausbildungsbeginn fehlt.");
    await expect(page.locator("#trainerId-error")).toHaveCount(0);
    expect(await queryOne("SELECT id FROM person WHERE email = $1", [ohne.email])).toBeNull();
  });

  test("AK-203 Admin ändert zugeordneten Ausbilder, Beginn, Ende und Rolle", async ({ page }) => {
    await login(page, accounts.bernd);
    await page.goto("/ausbilder/personen");
    await personRow(page, "Anna Azubi").getByRole("link").click();

    await page.getByLabel("Zugeordneter Ausbilder").selectOption({ label: "Clara Ausbilderin" });
    await page.getByLabel("Ausbildungsbeginn").fill("2026-08-01");
    await page.getByLabel("Ausbildungsende (optional)").fill("2029-07-31");
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByRole("status")).toHaveText("Änderungen gespeichert.");

    await page.goto("/ausbilder/personen");
    const anna = personRow(page, "Anna Azubi");
    await expect(anna).toContainText("Clara Ausbilderin");
    await expect(anna).toContainText("01.08.2026 – 31.07.2029");

    // Rollenwechsel Azubi → Ausbilder: Zuordnung und Zeitraum entfallen.
    await insertTrainee(otto);
    await page.reload();
    await personRow(page, otto.name).getByRole("link").click();
    await page.getByLabel("Rolle").selectOption("TRAINER");
    await expect(page.getByLabel("Zugeordneter Ausbilder")).toHaveCount(0);
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByRole("status")).toHaveText("Änderungen gespeichert.");
    expect(await queryOne("SELECT role, trainer_id FROM person WHERE email = $1", [otto.email])).toEqual({
      role: "TRAINER",
      trainer_id: null,
    });
  });

  test("AK-204 Deaktivieren: sofort kein Zugang mehr, Berichte für Ausbilder lesbar, nicht änderbar", async ({
    browser,
  }) => {
    const { id: emilId, reportId } = await insertTrainee({
      name: accounts.emil.name,
      email: accounts.emil.email,
      accountId: accounts.emil.accountId,
      withReport: true,
    });
    const emil = await loginIn(browser, accounts.emil);
    await expect(emil).toHaveURL(/\/azubi$/);

    const bernd = await loginIn(browser, accounts.bernd);
    await bernd.goto(`/ausbilder/personen/${emilId}`);
    await bernd.getByTestId("deactivate").getByRole("button", { name: "Deaktivieren" }).click();
    await expect(bernd.getByRole("status")).toContainText("Person deaktiviert");
    await expect(bernd.getByText("deaktiviert", { exact: true })).toBeVisible();

    // Entscheidung Sitzungen: Die laufende Sitzung ist bei der nächsten Anfrage ungültig.
    await emil.reload();
    await expect(emil).toHaveURL(/\/kein-zugang$/);
    await expect(emil.getByRole("heading", { name: NO_ACCESS })).toBeVisible();
    // Neue Anmeldung wird abgewiesen.
    const again = await loginIn(browser, accounts.emil);
    await expect(again).toHaveURL(/\/kein-zugang$/);

    // Berichte bleiben für Ausbilder lesbar, aber nicht änderbar.
    await bernd.goto(`/berichte/${reportId}`);
    await expect(bernd.getByTestId("report-trainee")).toHaveText("Emil Neu");
    await expect(bernd.getByText("Testtätigkeit")).toBeVisible();
    await expect(bernd.getByTestId("report-editable")).toHaveText(
      "Nicht änderbar: Die Person ist deaktiviert. Der Bericht bleibt lesbar.",
    );

    // Wieder aktivieren.
    await bernd.goto(`/ausbilder/personen/${emilId}`);
    await bernd.getByRole("button", { name: "Wieder aktivieren" }).click();
    await expect(bernd.getByRole("status")).toHaveText("Person wieder aktiviert.");
  });

  test("AK-204 Sitzungs-Cookie gilt höchstens 8 Stunden (Entscheidung Sitzungen)", async ({ page, context }) => {
    await login(page, accounts.bernd);
    const cookie = (await context.cookies()).find((c) => c.name.includes("session-token"));
    expect(cookie).toBeDefined();
    const hours = (cookie!.expires - Date.now() / 1000) / 3600;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThanOrEqual(8.01);
    expect(cookie!.httpOnly).toBe(true);
  });

  test("AK-206 endgültiges Löschen nur nach Eintippen des Namens; danach kein Bericht auffindbar", async ({ page }) => {
    const { id, reportId } = await insertTrainee({ ...otto, withReport: true });
    await login(page, accounts.bernd);
    await page.goto(`/ausbilder/personen/${id}`);

    await page.getByLabel(/Zur Bestätigung den Namen eintippen/).fill("Otto");
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page.locator("#confirmName-error")).toHaveText(
      `Zur Bestätigung bitte genau „${otto.name}“ eintippen.`,
    );
    expect(await queryOne("SELECT id FROM person WHERE id = $1", [id])).not.toBeNull();

    await page.getByLabel(/Zur Bestätigung den Namen eintippen/).fill(otto.name);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/ausbilder\/personen\?meldung=geloescht$/);
    await expect(page.getByRole("status")).toHaveText("Person und alle ihre Berichte wurden endgültig gelöscht.");
    await expect(personRow(page, otto.name)).toHaveCount(0);

    expect(await queryOne("SELECT count(*)::int AS n FROM weekly_report WHERE trainee_id = $1", [id])).toEqual({
      n: 0,
    });
    await page.goto(`/berichte/${reportId}`);
    await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
  });

  test("AK-206 Person in fremder Historie: Erklärung statt Löschen, „Deaktivieren“ wird angeboten", async ({
    page,
  }) => {
    // Fritz (Ausbilder) hat Ottos Bericht freigegeben – das steht in Ottos Historie.
    const { reportId } = await insertTrainee({ ...otto, withReport: true });
    const fritzId = await withDatabase(async (db) => {
      const { rows } = await db.query(
        `INSERT INTO person (id, email, name, role, updated_at) VALUES (gen_random_uuid(), $1, $2, 'TRAINER', now())
         RETURNING id`,
        [fritz.email, fritz.name],
      );
      await db.query(
        `INSERT INTO status_change (id, report_id, from_status, to_status, actor_id)
         VALUES (gen_random_uuid(), $1, 'SUBMITTED', 'APPROVED', $2)`,
        [reportId, rows[0].id],
      );
      return rows[0].id as string;
    });

    await login(page, accounts.bernd);
    await page.goto(`/ausbilder/personen/${fritzId}`);
    await page.getByLabel(/Zur Bestätigung den Namen eintippen/).fill(fritz.name);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();

    const explanation = page.getByRole("alert").filter({ hasText: "Fritz Historie kommt in der Historie" });
    await expect(explanation).toHaveText(
      "Fritz Historie kommt in der Historie von Berichten anderer Azubis vor (Statuswechsel oder Kommentare). " +
        "Damit diese Historie vollständig bleibt, lässt sich die Person nicht endgültig löschen, sondern nur deaktivieren.",
    );
    expect(await queryOne("SELECT active FROM person WHERE id = $1", [fritzId])).toEqual({ active: true });

    await page.getByRole("button", { name: "Stattdessen deaktivieren" }).click();
    await expect(page.getByRole("status")).toContainText("Person deaktiviert");
    expect(await queryOne("SELECT active FROM person WHERE id = $1", [fritzId])).toEqual({ active: false });
  });

  test("AK-207 der letzte aktive Ausbilder kann weder deaktiviert, gelöscht noch herabgestuft werden", async ({
    page,
  }) => {
    await login(page, accounts.bernd);
    // Clara (ohne zugeordnete Azubis) deaktivieren: Bernd bleibt als einziger aktiver Ausbilder.
    await page.goto(`/ausbilder/personen/${await personId(accounts.clara.email)}`);
    await page.getByTestId("deactivate").getByRole("button", { name: "Deaktivieren" }).click();
    await expect(page.getByRole("status")).toContainText("Person deaktiviert");

    await page.goto(`/ausbilder/personen/${await personId(accounts.bernd.email)}`);
    await page.getByTestId("deactivate").getByRole("button", { name: "Deaktivieren" }).click();
    await expect(page.getByTestId("deactivate").getByRole("alert")).toHaveText(
      "Bernd Ausbilder ist der letzte aktive Ausbilder und kann nicht deaktiviert werden.",
    );

    await page.getByLabel(/Zur Bestätigung den Namen eintippen/).fill("Bernd Ausbilder");
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(
      page.getByText("Bernd Ausbilder ist der letzte aktive Ausbilder und kann nicht gelöscht werden."),
    ).toBeVisible();

    await page.getByLabel("Rolle").selectOption("TRAINEE");
    await page.getByLabel("Zugeordneter Ausbilder").selectOption({ index: 0 });
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.locator("#role-error")).toHaveText(
      "Bernd Ausbilder ist der letzte aktive Ausbilder und kann nicht zum Azubi herabgestuft werden.",
    );

    expect(await queryOne("SELECT role, active FROM person WHERE email = $1", [accounts.bernd.email])).toEqual({
      role: "TRAINER",
      active: true,
    });
  });

  test("AK-208 Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar", async ({ page }) => {
    await login(page, accounts.clara);
    const berndId = await personId(accounts.bernd.email);
    await page.goto(`/ausbilder/personen/${berndId}`);
    await page.getByTestId("deactivate").getByRole("button", { name: "Deaktivieren" }).click();
    await expect(page.getByTestId("deactivate").getByRole("alert")).toHaveText(
      "Bernd Ausbilder sind noch Azubis zugeordnet (Anna Azubi). Bitte diese zuerst einem anderen Ausbilder zuordnen.",
    );
    expect(await queryOne("SELECT active FROM person WHERE id = $1", [berndId])).toEqual({ active: true });

    // Anna Clara zuordnen, dann klappt das Deaktivieren.
    await page.goto(`/ausbilder/personen/${await personId(accounts.anna.email)}`);
    await page.getByLabel("Zugeordneter Ausbilder").selectOption({ label: "Clara Ausbilderin" });
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByRole("status")).toHaveText("Änderungen gespeichert.");

    await page.goto(`/ausbilder/personen/${berndId}`);
    await page.getByTestId("deactivate").getByRole("button", { name: "Deaktivieren" }).click();
    await expect(page.getByRole("status")).toContainText("Person deaktiviert");
  });

  test("AK-209 Admin stellt das Bundesland der Firma ein", async ({ page }) => {
    await login(page, accounts.bernd);
    await page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Einstellungen" }).click();
    await expect(page.getByLabel("Bundesland der Firma")).toHaveValue("NW");

    await page.getByLabel("Bundesland der Firma").selectOption({ label: "Niedersachsen" });
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Gespeichert: Bundesland Niedersachsen.");

    await page.reload();
    await expect(page.getByLabel("Bundesland der Firma")).toHaveValue("NI");
    expect(await queryOne("SELECT federal_state FROM setting WHERE id = 1")).toEqual({ federal_state: "NI" });
  });

  test("AK-1102 Nutzerverwaltung bei 375 px Breite ohne horizontales Scrollen", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const page = await context.newPage();
    await login(page, accounts.bernd);
    const anna = await personId(accounts.anna.email);

    for (const path of [
      "/ausbilder",
      "/ausbilder/personen",
      "/ausbilder/personen/neu",
      `/ausbilder/personen/${anna}`,
      "/ausbilder/einstellungen",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
});
