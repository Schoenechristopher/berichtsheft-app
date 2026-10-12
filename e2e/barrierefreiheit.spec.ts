import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
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

/**
 * Barrierefreiheit (UI-AK-16): axe meldet auf allen Seiten keine Verstöße der Stufen A und AA
 * (WCAG 2.0 bis 2.2), hell und dunkel, bei 1280 und 375 px. Läuft im Projekt „a11y“ (Chromium).
 * Geprüft werden auch offene Zustände: Schublade, Dialog, Vorschau der Glocke, Prüfansicht mit
 * ausgewähltem Bericht. Ausgenommen ist nur das Entwicklungs-Overlay von Next.js (`next dev`),
 * das es im Produktions-Build nicht gibt.
 */
const emil = accounts.emil;
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld beschriftet" },
  { dayType: "WORK", activities: "Switch konfiguriert" },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke" },
  { dayType: "WORK", activities: "Druckerwartung" },
  { dayType: "VACATION", activities: "" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 375, height: 812 },
] as const;
const SCHEMES = ["light", "dark"] as const;

async function expectNoViolations(page: Page, where: string) {
  await page.waitForLoadState("networkidle");
  // Platzhalter (Skeleton) sind nach dem Laden verschwunden; geprüft wird der Inhalt.
  await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude("nextjs-portal").analyze();
  const violations = result.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n    ${violation.nodes
        .slice(0, 5)
        .map((node) => node.target.join(" "))
        .join("\n    ")}`,
  );
  expect(violations, `axe-Verstöße auf ${where}`).toEqual([]);
}

async function session(
  browser: Browser,
  account: (typeof accounts)[keyof typeof accounts] | null,
  scheme: string,
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({ colorScheme: scheme as "light" | "dark", viewport });
  const page = await context.newPage();
  if (account) {
    await login(page, account);
  }
  return { context, page };
}

test.describe("Barrierefreiheit", () => {
  test.describe.configure({ mode: "serial" });
  let reviewReportId: string;

  test.beforeAll(async ({ browser }) => {
    await restoreSeedState();
    // Ein eingereichter Bericht für die Prüfansicht.
    await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
    reviewReportId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    const { context, page } = await session(browser, emil, "light", VIEWPORTS[0]);
    await page.goto(`/berichte/${reviewReportId}`);
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();
    await page.getByRole("dialog", { name: "Bericht einreichen?" }).getByRole("button", { name: "Einreichen" }).click();
    await expect(page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    await context.close();
  });

  test.afterAll(async () => {
    await deletePersons(emil.email);
  });

  for (const scheme of SCHEMES) {
    for (const viewport of VIEWPORTS) {
      const label = `${scheme === "light" ? "hell" : "dunkel"}, ${viewport.width} px`;

      test.describe(label, () => {
        test("UI-AK-16 axe ohne Verstöße auf allen Seiten", async ({ browser }) => {
          test.setTimeout(240_000);
          const narrow = viewport.width < 1024;

          // Ohne Anmeldung: Anmelden, Seite nicht gefunden.
          const anonymous = await session(browser, null, scheme, viewport);
          for (const path of ["/anmelden", "/anmelden?ziel=%2Fazubi", "/gibt-es-nicht"]) {
            await anonymous.page.goto(path);
            await expectNoViolations(anonymous.page, `${path} (${label})`);
          }
          await anonymous.context.close();

          // Kein Zugang.
          const dora = await session(browser, accounts.dora, scheme, viewport);
          await expectNoViolations(dora.page, `/kein-zugang (${label})`);
          await dora.context.close();

          // Azubi.
          const anna = await session(browser, accounts.anna, scheme, viewport);
          for (const path of [
            "/azubi",
            "/azubi/wochen",
            "/azubi/wochen?status=freigegeben",
            `/berichte/${await annasSeedReportId()}`,
            "/benachrichtigungen",
            "/einstellungen",
            "/entwickler-postfach",
          ]) {
            await anna.page.goto(path);
            await expectNoViolations(anna.page, `${path} (${label})`);
          }
          // Offene Zustände: Schublade bzw. Vorschau der Glocke, Dialog „Einreichen“ und Sammel-PDF.
          await anna.page.goto("/azubi");
          if (narrow) {
            await anna.page.getByRole("button", { name: "Menü öffnen" }).click();
            await expectNoViolations(anna.page, `Schublade (${label})`);
            await anna.page.keyboard.press("Escape");
          } else {
            await anna.page
              .getByRole("banner")
              .getByRole("button", { name: /^Benachrichtigungen/ })
              .click();
            await expect(anna.page.getByRole("region", { name: "Neueste Benachrichtigungen" })).toBeVisible();
            await expectNoViolations(anna.page, `Vorschau der Glocke (${label})`);
            await anna.page.keyboard.press("Escape");
          }
          await anna.page.goto(`/berichte/${await annasSeedReportId()}`);
          await anna.page.getByRole("button", { name: "Einreichen", exact: true }).click();
          await expectNoViolations(anna.page, `Fehlerleiste beim Einreichen (${label})`);
          await anna.page.goto("/azubi/wochen");
          await anna.page.getByRole("button", { name: "Berichtsheft als PDF herunterladen" }).click();
          await expectNoViolations(anna.page, `Dialog Sammel-PDF (${label})`);
          await anna.context.close();

          // Ausbilder.
          const bernd = await session(browser, accounts.bernd, scheme, viewport);
          const annaId = await personId(accounts.anna.email);
          for (const path of [
            "/ausbilder",
            "/ausbilder/pruefliste",
            `/ausbilder/pruefliste?bericht=${reviewReportId}`,
            "/ausbilder/pruefliste?filter=alle",
            `/berichte/${reviewReportId}`,
            "/ausbilder/azubis",
            `/ausbilder/azubis/${annaId}`,
            "/ausbilder/personen",
            "/ausbilder/personen/neu",
            `/ausbilder/personen/${annaId}`,
            "/ausbilder/nicht-zustellbar",
            "/benachrichtigungen",
            "/einstellungen",
          ]) {
            await bernd.page.goto(path);
            await expectNoViolations(bernd.page, `${path} (${label})`);
          }
          // Dialog „Ablehnen“ mit geöffnetem Tageskommentar.
          await bernd.page.goto(`/berichte/${reviewReportId}`);
          await bernd.page.getByRole("button", { name: "Kommentar zu diesem Tag (Montag, 28.09.2026)" }).click();
          await bernd.page.getByRole("button", { name: "Ablehnen", exact: true }).click();
          await expectNoViolations(bernd.page, `Dialog „Ablehnen“ (${label})`);
          await bernd.context.close();
        });
      });
    }
  }
});
