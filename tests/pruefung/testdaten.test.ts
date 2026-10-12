import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountToCreate, accountWithoutEntry, seedFederalState, seedPersons } from "@/lib/seed-data";

interface TestPerson {
  schluessel: string;
  name: string;
  email: string;
  konto: string;
  rolle: "azubi" | "ausbilder" | null;
  angelegt: boolean;
  ausbildungsbeginn?: string;
}

const file = path.resolve(import.meta.dirname, "../../specs/pruefung/testdaten.json");
const data = JSON.parse(readFileSync(file, "utf8")) as { bundesland: string; personen: TestPerson[] };

const ROLES = { TRAINEE: "azubi", TRAINER: "ausbilder" } as const;

describe("Gemeinsame Testdaten (specs/pruefung/testdaten.json)", () => {
  it("stimmen mit dem Seed der TypeScript-App überein", () => {
    const seeded = Object.entries(seedPersons).map(([key, person]) => ({
      schluessel: key,
      name: person.name,
      email: person.email,
      konto: person.accountId,
      rolle: ROLES[person.role],
      angelegt: true,
      ...("trainingStart" in person ? { ausbildungsbeginn: person.trainingStart } : {}),
    }));
    const notSeeded = (
      [
        ["dora", accountWithoutEntry],
        ["emil", accountToCreate],
      ] as const
    ).map(([key, account]) => ({
      schluessel: key,
      name: account.name,
      email: account.email,
      konto: account.accountId,
      rolle: null,
      angelegt: false,
    }));
    const expected = [...seeded, ...notSeeded].sort((a, b) => a.schluessel.localeCompare(b.schluessel));
    const actual = data.personen
      .map(({ schluessel, name, email, konto, rolle, angelegt, ausbildungsbeginn }) => ({
        schluessel,
        name,
        email,
        konto,
        rolle,
        angelegt,
        ...(ausbildungsbeginn ? { ausbildungsbeginn } : {}),
      }))
      .sort((a, b) => a.schluessel.localeCompare(b.schluessel));
    expect(actual).toEqual(expected);
    expect(data.bundesland).toBe(seedFederalState);
  });

  it("Anna ist Bernd zugeordnet, wie im Seed (prisma/seed.ts)", () => {
    const seed = readFileSync(path.resolve(import.meta.dirname, "../../prisma/seed.ts"), "utf8");
    expect(seed).toContain("trainerId: bernd.id");
    expect(data.personen.find((person) => person.schluessel === "anna")).toMatchObject({ ausbilder: "bernd" });
  });

  it("enthalten kein Feld „id“ (prueffallIds() liest jede JSON-Datei unter specs/pruefung/)", () => {
    expect(readFileSync(file, "utf8")).not.toMatch(/"id"\s*:/);
  });
});
