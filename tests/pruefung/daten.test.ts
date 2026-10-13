/**
 * Daten-Runner für TypeScript (`specs/pruefung/format.md`, „Aufbau eines Daten-Falls“): führt jeden
 * Prüffall der Ebene `daten` aus `specs/pruefung/*.json` gegen die Test-Datenbank aus (Vitest-Projekt
 * „db“). Vor jedem Fall wird die Datenbank geleert und der Ausgangsbestand neu hergestellt; die Uhr wird
 * nach jedem Fall zurückgesetzt. Alle anderen Ebenen führt der Fachlogik-Runner aus (`cases.ts`).
 */
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { resetClock } from "@/domain/clock";
import { resetDatabase, testDb } from "../db/helpers";
import { assertNoDeviation, loadCases } from "./cases";
import { runDataCase } from "./daten-adapter";

const prisma = testDb();
const cases = loadCases().filter(({ entry }) => entry.ebene === "daten");

afterEach(() => {
  resetClock();
});

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

describe("Neutrale Prüffälle der Ebene „daten“ (specs/pruefung)", () => {
  it("es gibt Daten-Fälle", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const { file, entry } of cases) {
    it(`${entry.id} (${file}, daten)`, async () => {
      assertNoDeviation(entry);
      expect(await runDataCase(prisma, entry)).toEqual(entry.erwartet);
    });
  }
});
