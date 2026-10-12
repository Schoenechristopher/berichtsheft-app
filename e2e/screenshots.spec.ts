import { expect, test, type Browser } from "@playwright/test";
import {
  accounts,
  deletePersons,
  insertTrainee,
  login,
  prepareWeek,
  restoreSeedState,
  type DayContent,
} from "./helpers";

/**
 * Screenshots der vier Hauptseiten der UI-Spezifikation (Start Azubi, Woche erfassen, Prüfansicht,
 * Einstellungen) am Desktop (1280 px) und am Handy (375 px), hell und dunkel. Läuft im Projekt
 * „screenshots“ und legt die Bilder unter `screenshots/` ab; CI lädt sie als Artefakt hoch.
 * Lokal: `E2E_LOGIN_MODE=test npm run test:e2e -- --project=screenshots`.
 */
const emil = accounts.emil;
const fullWeek: DayContent[] = [
  { dayType: "WORK", activities: "Patchfeld im Serverraum beschriftet und dokumentiert." },
  { dayType: "WORK", activities: "Switch konfiguriert, VLANs für die Etage 2 angelegt." },
  { dayType: "SCHOOL", activities: "Lernfeld 3: Netzwerke planen, Subnetting geübt." },
  { dayType: "WORK", activities: "Druckerwartung und Tonerwechsel im 1. OG." },
  { dayType: "VACATION", activities: "" },
];
const DEVICES = [
  { name: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "handy", viewport: { width: 375, height: 812 } },
] as const;

async function session(
  browser: Browser,
  account: (typeof accounts)[keyof typeof accounts],
  scheme: "light" | "dark",
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({ colorScheme: scheme, viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await login(page, account);
  return { context, page };
}

test.describe("Screenshots", () => {
  test.describe.configure({ mode: "serial" });
  let reviewId: string;

  test.beforeAll(async ({ browser }) => {
    await restoreSeedState();
    await insertTrainee({ name: emil.name, email: emil.email, accountId: emil.accountId });
    reviewId = await prepareWeek(emil.email, 2026, 40, fullWeek);
    const { context, page } = await session(browser, emil, "light", DEVICES[0].viewport);
    await page.goto(`/berichte/${reviewId}`);
    await page.getByRole("button", { name: "Einreichen", exact: true }).click();
    await page.getByRole("dialog", { name: "Bericht einreichen?" }).getByRole("button", { name: "Einreichen" }).click();
    await expect(page.getByTestId("report-status")).toHaveText("Status: Eingereicht");
    await context.close();
  });

  test.afterAll(async () => {
    await deletePersons(emil.email);
  });

  test("Screenshots der vier Hauptseiten, Desktop und Handy, hell und dunkel", async ({ browser }) => {
    test.setTimeout(180_000);
    for (const device of DEVICES) {
      for (const scheme of ["light", "dark"] as const) {
        const suffix = `${device.name}-${scheme === "light" ? "hell" : "dunkel"}`;
        const anna = await session(browser, accounts.anna, scheme, device.viewport);
        const shots: [string, string][] = [
          ["/azubi", "1-start-azubi"],
          ["/berichte/" + (await reportOf(anna.page)), "2-woche-erfassen"],
          ["/einstellungen", "4-einstellungen"],
        ];
        for (const [path, name] of shots) {
          await anna.page.goto(path);
          await anna.page.waitForLoadState("networkidle");
          await expect(anna.page.locator("[data-skeleton]")).toHaveCount(0);
          await anna.page.screenshot({ path: `screenshots/${name}-${suffix}.png`, fullPage: true });
        }
        await anna.context.close();

        const bernd = await session(browser, accounts.bernd, scheme, device.viewport);
        await bernd.page.goto(
          device.name === "desktop" ? `/ausbilder/pruefliste?bericht=${reviewId}` : `/berichte/${reviewId}`,
        );
        await bernd.page.waitForLoadState("networkidle");
        await bernd.page.screenshot({
          path: `screenshots/3-pruefansicht-${suffix}.png`,
          fullPage: device.name !== "desktop",
        });
        await bernd.context.close();
      }
    }
  });
});

/** Annas Woche KW 40/2026 aus dem Seed (teilweise ausgefüllt). */
async function reportOf(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/azubi/wochen");
  const href = await page.getByRole("link", { name: "KW 40/2026" }).getAttribute("href");
  return href!.split("/").pop()!;
}
