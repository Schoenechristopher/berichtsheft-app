/**
 * Testgrenzen des Ablauf-Runners: Prüffälle, die sich in einem Browser mit Playwright nachweislich nicht treu
 * nachstellen lassen. Jeder Eintrag braucht eine Begründung und eine Freigabe; der Fall erscheint im Bericht als
 * übersprungen mit dieser Begründung, kein stilles Auslassen. Er gilt nur für genau diese ID und diesen Browser.
 * `tests/pruefung/testgrenzen.test.ts` prüft, dass jede ID ein Ablauf-Fall ist.
 */
export interface TestLimit {
  id: string;
  /** Playwright-Projekt, z. B. `firefox`. */
  browser: string;
  grund: string;
  freigabe: string;
}

export const TESTGRENZEN: readonly TestLimit[] = [
  {
    id: "AK-408-03",
    browser: "firefox",
    grund:
      "Playwright kann in Firefox „Neuladen mit bestätigtem beforeunload-Dialog“ nicht treu nachstellen (page.reload ohne Dialog, location.reload ohne fortgesetzte Navigation); dieselbe Warnung ist in Firefox über AK-408-05 belegt",
    freigabe: "Chris, 13.10.2026",
  },
];

/** Testgrenze für diesen Fall in diesem Browser oder `undefined`. */
export function testLimit(id: string, browser: string): TestLimit | undefined {
  return TESTGRENZEN.find((limit) => limit.id === id && limit.browser === browser);
}
