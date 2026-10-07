import { describe, expect, it } from "vitest";
import {
  buildCoverage,
  levelOf,
  parseCriteria,
  parseTestNames,
  parseTests,
  renderMarkdown,
  shortText,
  unknownIds,
} from "./coverage";

const spec = `
| ID | Kriterium |
| --- | --- |
| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort gibt es nicht. |
| AK-1102 | Bei 375 px Breite ohne horizontales Scrollen. Ergänzung: alle Seiten. |
Fließtext mit AK-999 zählt nicht.
`;

describe("Nachweis der Testabdeckung (npm run ak:abdeckung)", () => {
  it("liest AK-IDs und Text nur aus den Tabellenzeilen der Spezifikation", () => {
    expect(parseCriteria(spec)).toEqual([
      { id: "AK-101", text: "Anmeldung nur über das Firmenkonto; ein eigenes Passwort gibt es nicht." },
      { id: "AK-1102", text: "Bei 375 px Breite ohne horizontales Scrollen. Ergänzung: alle Seiten." },
    ]);
  });

  it("Kurztext ist der erste Satz", () => {
    expect(shortText("Bei 375 px Breite ohne Scrollen. Ergänzung: alle Seiten.")).toBe(
      "Bei 375 px Breite ohne Scrollen.",
    );
    expect(shortText("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
  });

  it("findet Testnamen von Vitest und Playwright, aber keine describe-Blöcke und kein test.skip(Bedingung)", () => {
    const source = `
      describe("AK-101 Gruppe", () => {
        it("AK-101 einfacher Test", () => {});
        it.each(cases)("AK-1102 $fall", () => {});
        test.describe("Gruppe", () => {
          test(
            "AK-1102 umbrochener Aufruf",
            async ({ page }) => {
            test.skip(!mailpitUrl, "nur mit Mailpit");
          });
          test.skip("übersprungen", async () => {});
          test(\`Vorlage ohne Platzhalter\`, async function () {});
        });
      });
    `;
    expect(parseTestNames(source, "x.spec.ts")).toEqual([
      "AK-101 einfacher Test",
      "AK-1102 $fall",
      "AK-1102 umbrochener Aufruf",
      "übersprungen",
      "Vorlage ohne Platzhalter",
    ]);
  });

  it("liest Playwright-Tags; Beispielszenarien zählen über ihre Tags", () => {
    const source = `
      test("Einreichen scheitert an fehlendem Text", { tag: ["@AK-501", "@AK-502"] }, async ({ page }) => {});
      test("Ein Tag", { tag: "@AK-101" }, async () => {});
    `;
    const parsed = parseTests(source, "e2e/beispielszenarien.spec.ts");
    expect(parsed).toEqual([
      { name: "Einreichen scheitert an fehlendem Text", tags: ["@AK-501", "@AK-502"] },
      { name: "Ein Tag", tags: ["@AK-101"] },
    ]);
    const rows = buildCoverage(parseCriteria(spec), [
      { file: "e2e/beispielszenarien.spec.ts", ...parsed[1], level: "Browser" },
    ]);
    expect(rows[0].tests).toHaveLength(1);
    expect(renderMarkdown(rows)).toContain("`e2e/beispielszenarien.spec.ts`: Ein Tag (@AK-101) | Browser |");
  });

  it("ordnet die Ebene nach dem Ablageort zu", () => {
    expect(levelOf("e2e/beispielszenarien.spec.ts")).toBe("Browser");
    expect(levelOf("tests/db/people.test.ts")).toBe("DB");
    expect(levelOf("src/domain/weeks.test.ts")).toBe("Unit");
  });

  it("meldet Kriterien ohne Test und unbekannte AK-IDs; die Tabelle nennt Tests und Ebenen", () => {
    const criteria = parseCriteria(spec);
    const tests = [
      { file: "src/a.test.ts", name: "AK-101 Logik", level: "Unit" as const },
      { file: "e2e/a.spec.ts", name: "Szenario (AK-101 AK-1010)", level: "Browser" as const },
    ];
    const rows = buildCoverage(criteria, tests);
    expect(rows.map((row) => [row.id, row.tests.length])).toEqual([
      ["AK-101", 2],
      ["AK-1102", 0],
    ]);
    // AK-1010 ist kein Präfix-Treffer für AK-101 und kommt in der Spezifikation nicht vor.
    expect(unknownIds(criteria, tests)).toEqual(["AK-1010"]);
    const markdown = renderMarkdown(rows);
    expect(markdown).toContain("Abgedeckt: 1 von 2 Akzeptanzkriterien.");
    expect(markdown).toContain(
      "| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort gibt es nicht. | `src/a.test.ts`: AK-101 Logik<br>`e2e/a.spec.ts`: Szenario (AK-101 AK-1010) | Unit, Browser |",
    );
    expect(markdown).toContain("| AK-1102 | Bei 375 px Breite ohne horizontales Scrollen. | **kein Test** | – |");
  });
});
