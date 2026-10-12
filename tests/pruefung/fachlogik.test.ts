/**
 * Prüf-Runner für TypeScript (`specs/pruefung/format.md`): führt jeden Prüffall aus `specs/pruefung/*.json`
 * aus. Fälle der Ebene `fachlogik` laufen über den Adapter; für jede andere Ebene gibt es hier noch keinen
 * Runner, deshalb scheitert ihr Test (kein stilles Überspringen).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resetClock, setFixedNow } from "@/domain/clock";
import { call, parseInstant, type Input } from "./adapter";

interface CheckCase {
  id: string;
  modul: string;
  ebene: string;
  uhr?: string;
  schnittstelle?: string;
  eingabe?: Input;
  erwartet: unknown;
  abweichend?: Record<string, string>;
}

const dir = path.resolve(import.meta.dirname, "../../specs/pruefung");
const files = readdirSync(dir)
  .filter((file) => file.endsWith(".json") && file !== "testdaten.json")
  .sort();
const cases = files.flatMap((file) => {
  const content: unknown = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  if (!Array.isArray(content)) {
    throw new Error(`specs/pruefung/${file}: Prüffall-Datei muss eine Liste sein.`);
  }
  return (content as CheckCase[]).map((entry) => ({ file, entry }));
});

/** Führt einen Prüffall aus und liefert das Ergebnis des Adapters. */
function runCase(entry: CheckCase): unknown {
  if (entry.abweichend && "typescript" in entry.abweichend) {
    throw new Error("Die TypeScript-App ist die Referenz und hat keine Abweichungen.");
  }
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
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const { file, entry } of cases) {
    it(`${entry.id} (${file}, ${entry.ebene}${entry.schnittstelle ? `: ${entry.schnittstelle}` : ""})`, () => {
      expect(runCase(entry)).toEqual(entry.erwartet);
    });
  }
});
