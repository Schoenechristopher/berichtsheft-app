import { describe, expect, it } from "vitest";
import {
  buildCoverage,
  casesAsTests,
  checkCases,
  criterionOfCase,
  DEFERRED_CASES_REQUIRED,
  parseModuleTable,
  pendingCriteria,
  levelOf,
  missingMergeCriteria,
  parseMergeCriteria,
  MERGE_FLOW_LABEL,
  moduleOfSpecFile,
  parseCheckCases,
  parseModuleCriteria,
  parseCriteria,
  parseTestNames,
  parseTests,
  parseUiCriteria,
  renderMarkdown,
  shortText,
  unknownIds,
  type TestCase,
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

  it("liest UI-AK-IDs aus der Tabelle der UI-Spezifikation (eigener Abschnitt, Ebene laut Spezifikation)", () => {
    const uiSpec = `
| ID | Kriterium | Ebene |
| --- | --- | --- |
| UI-AK-01 | Ab 1024 px ist die Seitenleiste sichtbar, darunter nicht. | Browser |
| UI-AK-14 | Die Darstellung lässt sich auf System, Hell und Dunkel stellen; \`data-theme\` am html. | Browser + DB |
Fließtext mit UI-AK-99 zählt nicht.
| AK-101 | gehört nicht zur UI-Spezifikation |
`;
    const uiCriteria = parseUiCriteria(uiSpec);
    expect(uiCriteria).toEqual([
      { id: "UI-AK-01", text: "Ab 1024 px ist die Seitenleiste sichtbar, darunter nicht.", level: "Browser" },
      {
        id: "UI-AK-14",
        text: "Die Darstellung lässt sich auf System, Hell und Dunkel stellen; `data-theme` am html.",
        level: "Browser + DB",
      },
    ]);
    // AK-IDs und UI-AK-IDs werden getrennt gezählt: „UI-AK-14“ ist kein Treffer für eine AK-ID.
    const criteria = parseCriteria(spec);
    expect(criteria.map((criterion) => criterion.id)).toEqual(["AK-101", "AK-1102"]);
    const tests = [
      { file: "e2e/ui.spec.ts", name: "UI-AK-01 Seitenleiste", level: "Browser" as const },
      { file: "tests/db/theme.test.ts", name: "UI-AK-14 Darstellung am Konto", level: "DB" as const },
      { file: "e2e/ui.spec.ts", name: "UI-AK-14 UI-AK-21 Darstellung im Browser", level: "Browser" as const },
    ];
    const uiRows = buildCoverage(uiCriteria, tests);
    expect(uiRows.map((row) => [row.id, row.tests.length])).toEqual([
      ["UI-AK-01", 1],
      ["UI-AK-14", 2],
    ]);
    expect(buildCoverage(criteria, tests).every((row) => row.tests.length === 0)).toBe(true);
    expect(unknownIds([...criteria, ...uiCriteria], tests)).toEqual(["UI-AK-21"]);
    const markdown = renderMarkdown(buildCoverage(criteria, tests), uiRows);
    expect(markdown).toContain("## UI-Akzeptanzkriterien");
    expect(markdown).toContain("Abgedeckt: 2 von 2 UI-Akzeptanzkriterien.");
    expect(markdown).toContain(
      "| UI-AK-14 | Die Darstellung lässt sich auf System, Hell und Dunkel stellen; `data-theme` am html. | `tests/db/theme.test.ts`: UI-AK-14 Darstellung am Konto<br>`e2e/ui.spec.ts`: UI-AK-14 UI-AK-21 Darstellung im Browser | Browser + DB | DB, Browser |",
    );
  });
});

describe("Prüffälle in der Abdeckung (specs/pruefung)", () => {
  const criteria = parseCriteria(spec);
  const fall = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    modul: "M01",
    ebene: "fachlogik",
    schnittstelle: "istFeiertag",
    eingabe: { bundesland: "NW", datum: "2026-12-25" },
    erwartet: { feiertag: true },
    ...extra,
  });
  const read = (cases: unknown) => parseCheckCases(JSON.stringify(cases, null, 2), "specs/pruefung/M01.json");

  it("liest AK-IDs nur aus dem Abschnitt „Akzeptanzkriterien“ einer Fach-Spec; Modul aus dem Dateinamen", () => {
    const markdown = `
## 3. Regeln
| AK-999 | gehört nicht dazu |
## 4. Akzeptanzkriterien
| AK-ID | Kriterium | Regeln | Prüffälle |
| --- | --- | --- | --- |
| AK-101 | Text | M01-R01 | AK-101-01 |
| UI-AK-14 | Text | – | – |
## 5. Logisches Datenmodell
| AK-1102 | gehört nicht dazu |
`;
    expect(parseModuleCriteria(markdown)).toEqual(["AK-101", "UI-AK-14"]);
    expect(moduleOfSpecFile("M01-kalender-und-zeit.md")).toBe("M01");
    expect(moduleOfSpecFile("Q-plattform-und-qualitaet.md")).toBe("Q");
    expect(moduleOfSpecFile("00-uebersicht.md")).toBeNull();
    expect(moduleOfSpecFile("code-landkarte.md")).toBeNull();
  });

  it("Prüffälle zählen als Tests der Ebene „Prüffall“", () => {
    const { cases, errors } = read([fall("AK-101-01"), fall("AK-1102-01")]);
    expect(errors).toEqual([]);
    expect(criterionOfCase("AK-1102-01")).toBe("AK-1102");
    expect(criterionOfCase("UI-AK-14-02")).toBe("UI-AK-14");
    const rows = buildCoverage(criteria, casesAsTests(cases));
    expect(rows.map((row) => [row.id, row.tests.map((test) => test.level)])).toEqual([
      ["AK-101", ["Prüffall"]],
      ["AK-1102", ["Prüffall"]],
    ]);
    expect(renderMarkdown(rows)).toContain(
      "| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort gibt es nicht. | `specs/pruefung/M01.json`: AK-101-01 | Prüffall |",
    );
  });

  it("meldet Formfehler: Pflichtfelder, ID-Schema, Modul, Ebene und verschachteltes „id“", () => {
    expect(read({ id: "AK-101-01" }).errors).toEqual([
      "specs/pruefung/M01.json: Prüffall-Datei muss eine Liste von Prüffällen sein.",
    ]);
    expect(parseCheckCases("[", "x.json").errors[0]).toMatch(/^x.json: kein gültiges JSON/);
    const { cases, errors } = read([
      { id: "AK-101-01", modul: "M01", ebene: "fachlogik", erwartet: {} },
      fall("AK-101-1"),
      fall("AK-101-02", { modul: "M10" }),
      fall("AK-101-03", { ebene: "oberflaeche" }),
      fall("AK-101-04", { eingabe: { id: "verschachtelt" } }),
      { id: "AK-101-05", modul: "M05", ebene: "ablauf", erwartet: {} },
    ]);
    expect(errors).toEqual([
      "specs/pruefung/M01.json, Eintrag 1: Pflichtfeld fehlt: schnittstelle, eingabe.",
      "specs/pruefung/M01.json: AK-101-1: ID folgt nicht dem Schema <AK-ID>-<NN>.",
      "specs/pruefung/M01.json: AK-101-02: unbekanntes Modul „M10“.",
      "specs/pruefung/M01.json: AK-101-03: unbekannte Ebene „oberflaeche“.",
      "specs/pruefung/M01.json, Eintrag 6: Pflichtfeld fehlt: uhr, schritte.",
      'specs/pruefung/M01.json: "id" darf nur auf der Ebene des Prüffalls stehen (7-mal bei 6 Prüffällen).',
    ]);
    expect(cases).toHaveLength(6);
  });

  it("verlangt bei der Ebene „daten“ Uhr und Schritte; ein vollständiger Daten-Fall zählt als Prüffall", () => {
    const { cases, errors } = read([
      { id: "AK-506-01", modul: "M05", ebene: "daten", erwartet: {} },
      { id: "AK-506-02", modul: "M05", ebene: "daten", uhr: "2026-10-06T10:00:00+02:00", erwartet: {} },
      {
        id: "AK-506-03",
        modul: "M05",
        ebene: "daten",
        uhr: "2026-10-06T10:00:00+02:00",
        ausgangsbestand: { berichte: [{ azubi: "anna", woche: "2026-W40" }] },
        schritte: [{ als: "anna", aktion: "zurueckziehen", azubi: "anna", woche: "2026-W40" }],
        erwartet: { ergebnisse: [], berichte: [] },
      },
    ]);
    expect(errors).toEqual([
      "specs/pruefung/M01.json, Eintrag 1: Pflichtfeld fehlt: uhr, schritte.",
      "specs/pruefung/M01.json, Eintrag 2: Pflichtfeld fehlt: schritte.",
    ]);
    expect(casesAsTests(cases).map((test) => [test.name, test.level])).toEqual([
      ["AK-506-01", "Prüffall"],
      ["AK-506-02", "Prüffall"],
      ["AK-506-03", "Prüffall"],
    ]);
  });

  it("meldet doppelte IDs, unbekannte AK-IDs, falsches Modul und AKs beschriebener Module ohne Prüffall", () => {
    const { cases } = read([
      fall("AK-101-01"),
      fall("AK-101-01"),
      fall("AK-999-01"),
      fall("AK-1102-01", { modul: "M05" }),
    ]);
    const modules = new Map([
      ["M01", ["AK-101"]],
      ["Q", ["AK-1102", "AK-101", "AK-1206"]],
    ]);
    expect(checkCases(cases, criteria, modules)).toEqual([
      "AK-101 gehört zwei Modulen: M01 und Q.",
      "Fach-Spec Q: AK-1206 steht nicht in der Spezifikation.",
      "specs/pruefung/M01.json: Prüffall-ID AK-101-01 ist doppelt.",
      "specs/pruefung/M01.json: AK-999-01 nennt keine bekannte AK-ID.",
      "specs/pruefung/M01.json: AK-1102-01 – AK-1102 gehört nicht zum Modul M05.",
      "Modul Q: AK-1206 hat keinen Prüffall.",
    ]);
    expect(checkCases(read([fall("AK-101-01")]).cases, criteria, new Map([["M01", ["AK-101"]]]))).toEqual([]);
  });
});

describe("Ebene der AK-Tabelle einer Fach-Spec (Entscheidung E1: „Ablauf, G3“)", () => {
  const criteria = parseCriteria(spec);
  const fall = (id: string) => ({
    id,
    modul: "M02",
    ebene: "fachlogik",
    schnittstelle: "darfAktion",
    eingabe: {},
    erwartet: {},
  });
  const cases = (...ids: string[]) =>
    parseCheckCases(JSON.stringify(ids.map(fall), null, 2), "specs/pruefung/M02.json").cases;
  const table = (rows: string) => `
## 4. Akzeptanzkriterien
| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
${rows}
## 5. Logisches Datenmodell
`;

  it("liest die fünfte Spalte „Ebene“ mit den Werten Fachlogik, Daten und „Ablauf, G3“", () => {
    expect(
      parseModuleTable(
        table(
          [
            "| AK-101 | Anmeldung | M02-R01 | folgt in G3 | Ablauf, G3 |",
            "| AK-1102 | Text mit \\| im Kriterium | M02-R02 | AK-1102-01 | Fachlogik |",
            "| UI-AK-14 | Text | – | – | Daten |",
          ].join("\n"),
        ),
      ),
    ).toEqual({
      criteria: [
        { id: "AK-101", level: "Ablauf, G3" },
        { id: "AK-1102", level: "Fachlogik" },
        { id: "UI-AK-14", level: "Daten" },
      ],
      errors: [],
    });
  });

  it("vierspaltige Tabelle (ohne Ebene) bleibt lesbar", () => {
    expect(parseModuleTable(table("| AK-101 | Text | M01-R01 | AK-101-01 |"))).toEqual({
      criteria: [{ id: "AK-101" }],
      errors: [],
    });
  });

  it("unbekannter Ebenenwert oder falsche Spaltenzahl in der Spec-Tabelle ist ein Fehler", () => {
    const { criteria: rows, errors } = parseModuleTable(
      table(
        [
          "| AK-101 | Text | M02-R01 | folgt in G3 | Browser |",
          "| AK-1102 | Text | M02-R01 | AK-1102-01 | Fachlogik | x |",
        ].join("\n"),
      ),
    );
    expect(rows.map((row) => row.id)).toEqual(["AK-101", "AK-1102"]);
    expect(errors).toEqual([
      "AK-101: unbekannte Ebene „Browser“ (erlaubt: Fachlogik; Daten; Ablauf; Ablauf, G3).",
      "AK-1102: Zeile hat 6 statt 4 oder 5 Spalten.",
    ]);
  });

  it("markierte AK („Ablauf, G3“) ohne Prüffall ist seit G3 ein Fehler (Schalter an)", () => {
    const modules = new Map([["M02", ["AK-101", "AK-1102"]]]);
    const deferred = new Set(["AK-101"]);
    expect(DEFERRED_CASES_REQUIRED).toBe(true);
    expect(checkCases(cases("AK-1102-01"), criteria, modules, deferred)).toEqual([
      "Modul M02: AK-101 hat keinen Prüffall.",
    ]);
  });

  it("markierte AK („Ablauf, G3“) ohne Prüffall ist mit ausgeschaltetem Schalter (G2) kein Fehler und wird als „Prüffall folgt (G3)“ gekennzeichnet", () => {
    const modules = new Map([["M02", ["AK-101", "AK-1102"]]]);
    const deferred = new Set(["AK-101"]);
    expect(checkCases(cases("AK-1102-01"), criteria, modules, deferred, false)).toEqual([]);
    expect(pendingCriteria(deferred, cases("AK-1102-01"))).toEqual(["AK-101"]);
    const markdown = renderMarkdown(buildCoverage(criteria, []), [], new Set(["AK-101"]));
    expect(markdown).toContain("| AK-ID | Kurztext | Tests | Ebene | Prüffall folgt (G3) |");
    expect(markdown).toContain(
      "| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort gibt es nicht. | **kein Test** | – | ja |",
    );
    expect(markdown).toMatch(/\| AK-1102 \| .* \| – \| {2}\|\n/);
  });

  it("markierte AK mit Prüffall zählt normal und ist nicht mehr gekennzeichnet", () => {
    const modules = new Map([["M02", ["AK-101"]]]);
    const deferred = new Set(["AK-101"]);
    expect(checkCases(cases("AK-101-01"), criteria, modules, deferred)).toEqual([]);
    expect(pendingCriteria(deferred, cases("AK-101-01"))).toEqual([]);
  });

  it("unmarkierte AK ohne Prüffall ist ein Fehler wie bisher", () => {
    const modules = new Map([["M02", ["AK-101", "AK-1102"]]]);
    expect(checkCases(cases("AK-1102-01"), criteria, modules, new Set())).toEqual([
      "Modul M02: AK-101 hat keinen Prüffall.",
    ]);
  });

  it("ab G3 (Schalter umgelegt) braucht auch die markierte AK einen Prüffall", () => {
    const modules = new Map([["M02", ["AK-101", "AK-1102"]]]);
    expect(checkCases(cases("AK-1102-01"), criteria, modules, new Set(["AK-101"]), true)).toEqual([
      "Modul M02: AK-101 hat keinen Prüffall.",
    ]);
  });
});

describe("AM-AK aus docs/07 in der Abdeckung", () => {
  const mergeSpec = `
| ID | Kriterium | Ebene |
| --- | --- | --- |
| AM-AK-01 | Ohne Label ist der Check grün. | Fachlogik |
| AM-AK-02 | Geschützter Pfad: rot. | Fachlogik |
| AM-AK-11 | Alles erfüllt: gemergt. | Ablauf |
Fließtext mit AM-AK-99 zählt nicht.
`;

  it("liest AM-AK-ID, Text und Ebene aus der Tabelle", () => {
    expect(parseMergeCriteria(mergeSpec)).toEqual({
      criteria: [
        { id: "AM-AK-01", text: "Ohne Label ist der Check grün.", level: "Fachlogik" },
        { id: "AM-AK-02", text: "Geschützter Pfad: rot.", level: "Fachlogik" },
        { id: "AM-AK-11", text: "Alles erfüllt: gemergt.", level: "Ablauf" },
      ],
      errors: [],
    });
  });

  it("meldet eine unbekannte Ebene und eine falsche Spaltenzahl", () => {
    const { errors } = parseMergeCriteria("| AM-AK-01 | Text | Browser |\n| AM-AK-02 | Text |");
    expect(errors).toEqual([
      "AM-AK-01: unbekannte Ebene „Browser“ (erlaubt: Fachlogik; Ablauf).",
      "AM-AK-02: Zeile hat 2 statt 3 Spalten.",
    ]);
  });

  it("zählt Tests zu AM-AK-IDs; Ablauf-AKs ohne Test sind kein Fehlen, Fachlogik ohne Test schon", () => {
    const { criteria } = parseMergeCriteria(mergeSpec);
    const tests: TestCase[] = [
      { file: "scripts/merge-kriterien/merge-kriterien.test.ts", name: "AM-AK-01 ohne Antrag", level: "Unit" },
    ];
    const rows = buildCoverage(criteria, tests);
    expect(rows.map((row) => row.tests.length)).toEqual([1, 0, 0]);
    expect(missingMergeCriteria(rows)).toEqual(["AM-AK-02"]);
    expect(unknownIds(criteria, [{ ...tests[0], name: "AM-AK-77 Tippfehler" }])).toEqual(["AM-AK-77"]);
  });

  it("schreibt den Abschnitt mit Testzahl und der Kennzeichnung für Ablauf-AKs", () => {
    const { criteria } = parseMergeCriteria(mergeSpec);
    const tests: TestCase[] = [{ file: "a.test.ts", name: "AM-AK-01 ohne Antrag", level: "Unit" }];
    const markdown = renderMarkdown([], [], new Set(), buildCoverage(criteria, tests));
    expect(markdown).toContain("## Automatisches Mergen (`docs/07`)");
    expect(markdown).toContain(
      "| AM-AK-01 | Ohne Label ist der Check grün. | `a.test.ts`: AM-AK-01 ohne Antrag | Fachlogik | 1 |  |",
    );
    expect(markdown).toContain(
      `| AM-AK-11 | Alles erfüllt: gemergt. | **kein Test** | Ablauf | 0 | ${MERGE_FLOW_LABEL} |`,
    );
    expect(renderMarkdown([], [])).not.toContain("Automatisches Mergen");
  });
});
