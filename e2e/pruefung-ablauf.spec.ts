import { expect, test, type TestInfo } from "@playwright/test";
import { assertNoDeviation, loadCases } from "../tests/pruefung/cases";
import { reseedAnna } from "./helpers";
import { FlowAdapter, setAppState } from "./pruefung/ablauf-adapter";
import { testLimit } from "./pruefung/testgrenzen";

/**
 * Ablauf-Runner für TypeScript (`specs/pruefung/format.md`, „Aufbau eines Ablauf-Falls“): führt jeden Prüffall der
 * Ebene `ablauf` aus `specs/pruefung/*.json` im Browser gegen die laufende App aus, je Fall ein Test. Vor jedem Fall
 * stellt er über die Testschnittstelle die Uhr und lädt die Testdaten, danach stellt er die Uhr zurück. Zum Schluss
 * stellt er den Seed-Zustand der übrigen Browser-Tests wieder her.
 *
 * Die Testschnittstelle gibt es nur außerhalb von Produktion mit Test-Login. Mit `E2E_LOGIN_MODE=test` ist das der
 * ohnehin gestartete Entwicklungsserver; gegen den Produktions-Build (Compose-Stack, Keycloak) startet
 * `playwright.config.ts` dafür einen zweiten Entwicklungsserver auf derselben Datenbank (`ABLAUF_URL`).
 */
const ablaufUrl = process.env.E2E_ABLAUF_URL ?? "";
const cases = loadCases().filter(({ entry }) => entry.ebene === "ablauf");

/** Geräteeinstellungen des Projekts (Desktop, 375 px …) für die Browser-Kontexte der Personen. */
function contextOptions(testInfo: TestInfo) {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, locale, timezoneId } = testInfo.project.use;
  return { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, locale, timezoneId };
}

test.describe("Neutrale Prüffälle der Ebene „ablauf“ (specs/pruefung)", () => {
  test.afterAll(async () => {
    await setAppState(ablaufUrl, { uhr: null, bestand: "testdaten" });
    await reseedAnna();
  });

  test("es gibt Ablauf-Fälle und eine Adresse der App mit Testschnittstelle", () => {
    expect(cases.length).toBeGreaterThan(0);
    expect(ablaufUrl).not.toBe("");
  });

  for (const { file, entry } of cases) {
    test(`${entry.id} (${file}, ablauf)`, async ({ browser }, testInfo) => {
      assertNoDeviation(entry);
      // Lange Abläufe (z. B. axe auf vielen Seiten) brauchen mehr als die Vorgabe von 60 s.
      test.setTimeout(60_000 + 8_000 * (Array.isArray(entry.schritte) ? entry.schritte.length : 0));
      const limit = testLimit(entry.id, testInfo.project.name);
      if (limit) {
        // Freigegebene Testgrenze: sichtbar übersprungen, mit Begründung im Bericht.
        testInfo.annotations.push({ type: "Testgrenze", description: `${limit.grund} (Freigabe: ${limit.freigabe})` });
        test.skip(true, `Testgrenze: ${limit.grund} (Freigabe: ${limit.freigabe})`);
      }
      const adapter = new FlowAdapter(browser, contextOptions(testInfo), ablaufUrl);
      try {
        expect(await adapter.run(entry)).toEqual(entry.erwartet);
      } finally {
        await adapter.close();
        await setAppState(ablaufUrl, { uhr: null });
      }
    });
  }
});
