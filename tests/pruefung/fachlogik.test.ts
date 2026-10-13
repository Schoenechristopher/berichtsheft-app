/**
 * Prüf-Runner für TypeScript (`specs/pruefung/format.md`): führt jeden Prüffall aus `specs/pruefung/*.json`
 * aus, außer den Fällen einer Ebene mit eigenem Runner (`OWN_RUNNER_LEVELS`: `daten` im Daten-Runner).
 * Fälle der Ebene `fachlogik` laufen über den Adapter; für jede andere Ebene gibt es noch keinen Runner,
 * deshalb scheitert ihr Test hier (kein stilles Überspringen).
 */
import { afterEach, describe, expect, it } from "vitest";
import { resetClock, setFixedNow } from "@/domain/clock";
import { call, parseInstant } from "./adapter";
import { OWN_RUNNER_LEVELS, assertNoDeviation, loadCases, type CheckCase } from "./cases";

const allCases = loadCases();
const cases = allCases.filter(({ entry }) => !Object.hasOwn(OWN_RUNNER_LEVELS, entry.ebene));

/** Führt einen Prüffall aus und liefert das Ergebnis des Adapters. */
function runCase(entry: CheckCase): unknown {
  assertNoDeviation(entry);
  if (entry.ebene !== "fachlogik") {
    throw new Error(`Für die Ebene „${entry.ebene}“ gibt es noch keinen TypeScript-Runner.`);
  }
  if (typeof entry.schnittstelle !== "string" || typeof entry.eingabe !== "object" || entry.eingabe === null) {
    throw new Error("Ein Fachlogik-Fall braucht „schnittstelle“ und „eingabe“.");
  }
  if (entry.uhr !== undefined) {
    setFixedNow(parseInstant(entry.uhr));
  }
  return call(entry.schnittstelle, entry.eingabe);
}

describe("Neutrale Prüffälle (specs/pruefung)", () => {
  afterEach(() => {
    resetClock();
  });

  it("es gibt Prüffälle", () => {
    expect(allCases.length).toBeGreaterThan(0);
  });

  for (const { file, entry } of cases) {
    it(`${entry.id} (${file}, ${entry.ebene}${entry.schnittstelle ? `: ${entry.schnittstelle}` : ""})`, () => {
      expect(runCase(entry)).toEqual(entry.erwartet);
    });
  }
});
