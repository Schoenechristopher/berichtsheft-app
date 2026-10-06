import { expect, test, type Page } from "@playwright/test";
import { accounts, deletePersons, login, personId, queryOne } from "./helpers";

const fritz = { name: "Fritz Direkt", email: "fritz.direkt@berichtsheft.test" };

/** Mitgeschnittener Aufruf einer Server-Aktion, so wie der Browser ihn sendet. */
interface CapturedAction {
  url: string;
  headers: Record<string, string>;
  body: Buffer;
}

/**
 * Löst eine Server-Aktion im Browser aus, fängt die Anfrage ab, bevor sie den Server erreicht,
 * und gibt sie zum erneuten Senden zurück.
 */
async function captureServerAction(page: Page, trigger: () => Promise<void>): Promise<CapturedAction> {
  let captured: CapturedAction | undefined;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      captured = { url: request.url(), headers: request.headers(), body: request.postDataBuffer() ?? Buffer.alloc(0) };
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await trigger();
  await expect.poll(() => captured !== undefined).toBe(true);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  return captured!;
}

/** Sendet die mitgeschnittene Server-Aktion mit den Cookies der angegebenen Seite. */
async function replay(page: Page, action: CapturedAction) {
  const keep = ["next-action", "content-type", "accept", "next-router-state-tree"];
  const headers = Object.fromEntries(Object.entries(action.headers).filter(([name]) => keep.includes(name)));
  return page.request.post(action.url, { headers, data: action.body, maxRedirects: 0 });
}

test.describe("Admin-Funktionen für Azubis gesperrt", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    await deletePersons(fritz.email);
    await queryOne("UPDATE person SET active = true WHERE email = $1", [accounts.clara.email]);
  });

  test("AK-104 Azubi erreicht Admin-Seiten auch per direkt eingegebener URL nicht", async ({ page }) => {
    const bernd = await personId(accounts.bernd.email);
    await login(page, accounts.anna);

    for (const path of [
      "/ausbilder",
      "/ausbilder/personen",
      "/ausbilder/personen/neu",
      `/ausbilder/personen/${bernd}`,
      "/ausbilder/einstellungen",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/azubi$/);
      await expect(page.getByRole("heading", { name: "Personen" })).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Hauptmenü" })).toHaveCount(0);
    }
  });

  test("AK-104 direkter Aufruf der Server-Aktionen durch einen Azubi ändert nichts", async ({ browser }) => {
    const trainerContext = await browser.newContext();
    const trainer = await trainerContext.newPage();
    await login(trainer, accounts.bernd);
    const traineeContext = await browser.newContext();
    const trainee = await traineeContext.newPage();
    await login(trainee, accounts.anna);

    // 1. Person anlegen: Aufruf beim Ausbilder mitschneiden, als Azubi senden.
    await trainer.goto("/ausbilder/personen/neu");
    await trainer.getByLabel("Name").fill(fritz.name);
    await trainer.getByLabel("Firmen-E-Mail").fill(fritz.email);
    await trainer.getByLabel("Rolle").selectOption("TRAINER");
    const create = await captureServerAction(trainer, () =>
      trainer.getByRole("button", { name: "Person anlegen" }).click(),
    );

    await replay(trainee, create);
    expect(await queryOne("SELECT id FROM person WHERE email = $1", [fritz.email])).toBeNull();

    // Gegenprobe: derselbe Aufruf mit der Sitzung des Ausbilders wirkt – der Mitschnitt ist also gültig.
    await replay(trainer, create);
    expect(await queryOne("SELECT name FROM person WHERE email = $1", [fritz.email])).toEqual({ name: fritz.name });

    // 2. Deaktivieren: Aufruf für Clara mitschneiden, als Azubi senden.
    const clara = await personId(accounts.clara.email);
    await trainer.goto(`/ausbilder/personen/${clara}`);
    const deactivate = await captureServerAction(trainer, () =>
      trainer.getByTestId("deactivate").getByRole("button", { name: "Deaktivieren" }).click(),
    );

    await replay(trainee, deactivate);
    expect(await queryOne("SELECT active FROM person WHERE id = $1", [clara])).toEqual({ active: true });

    await replay(trainer, deactivate);
    expect(await queryOne("SELECT active FROM person WHERE id = $1", [clara])).toEqual({ active: false });

    await trainerContext.close();
    await traineeContext.close();
  });
});
