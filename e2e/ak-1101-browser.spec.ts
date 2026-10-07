import { expect, test } from "@playwright/test";
import { accounts, annasSeedReportId, login } from "./helpers";

/**
 * Browser-Matrix (AK-1101): Alle Tests laufen in den Projekten „chromium“, „firefox“ und „msedge“
 * (siehe playwright.config.ts). Dieser Test belegt, dass im jeweiligen Projekt wirklich der
 * erwartete Browser läuft, und geht einmal den Kernablauf durch.
 */
const expectedBrowser: Record<string, { engine: string; userAgent: RegExp }> = {
  chromium: { engine: "chromium", userAgent: /Chrome\/\d+/ },
  firefox: { engine: "firefox", userAgent: /Firefox\/\d+/ },
  msedge: { engine: "chromium", userAgent: /Edg\/\d+/ },
};

test("AK-1101 die App läuft im Browser des Projekts: anmelden, Bericht öffnen, Benachrichtigungen, abmelden", async ({
  page,
  browserName,
}) => {
  const project = test.info().project.name;
  const expected = expectedBrowser[project];
  expect(expected, `Projekt ${project} gehört zur Browser-Matrix`).toBeDefined();
  expect(browserName).toBe(expected.engine);
  const userAgent = await page.evaluate(() => navigator.userAgent);
  expect(userAgent).toMatch(expected.userAgent);
  test.info().annotations.push({ type: "Browser", description: `${project}: ${page.context().browser()?.version()}` });

  await login(page, accounts.anna);
  await expect(page).toHaveURL(/\/azubi$/);
  await expect(page.getByRole("heading", { name: "Meine Wochenberichte" })).toBeVisible();
  await expect(page).toHaveTitle("Meine Wochenberichte · Berichtsheft");

  await page.goto(`/berichte/${await annasSeedReportId()}`);
  await expect(page.getByRole("heading", { name: /KW 40\/2026/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Montag, 28.09.2026" }).getByLabel("Tagesart")).toHaveValue("WORK");

  await page.getByRole("link", { name: /^Benachrichtigungen/ }).click();
  await expect(page.getByRole("heading", { name: "Benachrichtigungen" })).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();
  await page.waitForURL(/\/anmelden/);
  await page.goto("/azubi");
  await expect(page).toHaveURL(/\/anmelden/);
});
