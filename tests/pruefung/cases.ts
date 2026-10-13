/**
 * Lädt die neutralen Prüffälle aus `specs/pruefung/*.json` für die Prüf-Runner und legt fest, welcher
 * Runner welche Ebene ausführt. Jeder Fall wird von genau einem Runner ausgeführt: Fälle der Ebene
 * `daten` vom Daten-Runner (`daten.test.ts`, gegen die Test-Datenbank), alle anderen vom
 * Fachlogik-Runner (`fachlogik.test.ts`), der an einer Ebene ohne Runner scheitert (kein stilles
 * Überspringen).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Input } from "./adapter";

export interface CheckCase {
  id: string;
  modul: string;
  ebene: string;
  uhr?: string;
  schnittstelle?: string;
  eingabe?: Input;
  ausgangsbestand?: Input;
  schritte?: unknown;
  erwartet: unknown;
  abweichend?: Record<string, string>;
}

/** Ebenen, die ein eigener Runner ausführt; alle übrigen Fälle laufen im Fachlogik-Runner. */
export const OWN_RUNNER_LEVELS = { daten: "tests/pruefung/daten.test.ts" } as const;

const dir = path.resolve(import.meta.dirname, "../../specs/pruefung");

/** Alle Prüffälle mit ihrer Datei, Dateien alphabetisch. */
export function loadCases(): { file: string; entry: CheckCase }[] {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json") && file !== "testdaten.json")
    .sort();
  return files.flatMap((file) => {
    const content: unknown = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    if (!Array.isArray(content)) {
      throw new Error(`specs/pruefung/${file}: Prüffall-Datei muss eine Liste sein.`);
    }
    return (content as CheckCase[]).map((entry) => ({ file, entry }));
  });
}

/** Die TypeScript-App ist die Referenz und hat keine Abweichungen (`format.md`, „Abweichend, begründet“). */
export function assertNoDeviation(entry: CheckCase): void {
  if (entry.abweichend && "typescript" in entry.abweichend) {
    throw new Error("Die TypeScript-App ist die Referenz und hat keine Abweichungen.");
  }
}
