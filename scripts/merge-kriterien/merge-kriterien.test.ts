import { describe, expect, it } from "vitest";
import {
  entscheideAutomerge,
  erstelleBericht,
  istGeschuetzt,
  KRITERIEN,
  offenePunkte,
  pruefeDependabot,
  prueffallIds,
  testsJeAk,
  type Entscheidung,
  type PrDaten,
} from "./merge-kriterien.mjs";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const ABNAHME = { text: `Abnahme bestanden.\n<!-- abnahme-steuerung sha=${SHA} -->`, schreibrecht: true };

/** Ein PR, der alle Regeln erfüllt; jeder Test ändert nur, was er prüft. */
function pr(teil: Partial<PrDaten> = {}): PrDaten {
  return {
    ereignis: "pull_request",
    labels: ["automerge"],
    vonAussen: false,
    autor: "schoenechristopher96-lgtm",
    titel: "Paket M04 auf Liferay 7.2",
    beschreibung: "## Inhalt\n\nModul M04.\n",
    headSha: SHA,
    dateien: [{ pfad: "src/domain/report-days.ts", status: "M", zeilen: 40, neueZeilen: ["const x = 1;"] }],
    kommentare: [ABNAHME],
    testsVorher: { "AK-401": 3 },
    testsNachher: { "AK-401": 4 },
    prueffaelleVorher: [],
    prueffaelleNachher: [],
    laufzeitAbhaengigkeiten: ["next", "react"],
    mainGruen: true,
    schalterAn: true,
    ...teil,
  };
}

/** Verstöße als Kriterium, Code und Detail; Tests prüfen diese, nicht den Wortlaut. */
function verstoesse(entscheidung: Entscheidung) {
  return entscheidung.kriterien.flatMap(({ id, gruende }) =>
    gruende.map(({ code, detail }) => (detail === undefined ? { id, code } : { id, code, detail })),
  );
}

describe("entscheideAutomerge (docs/07-spec-automatisches-mergen.md)", () => {
  it("zulässig, wenn alle Regeln erfüllt sind", () => {
    expect(entscheideAutomerge(pr())).toMatchObject({ antrag: true, zulaessig: true, gruende: [] });
  });

  it("ein vollständig zulässiger PR hat nur erfüllte Kriterien", () => {
    const { kriterien } = entscheideAutomerge(pr());
    expect(kriterien.map(({ id }) => id)).toEqual(Object.keys(KRITERIEN));
    expect(kriterien.every(({ erfuellt, gruende }) => erfuellt && gruende.length === 0)).toBe(true);
  });

  it("AM-AK-01 ohne Label automerge: grün mit „kein Antrag“, auch bei geschützten Pfaden", () => {
    const entscheidung = entscheideAutomerge(
      pr({ labels: [], dateien: [{ pfad: "docs/01-spezifikation.md", status: "M", zeilen: 3 }], schalterAn: false }),
    );
    expect(entscheidung).toMatchObject({ antrag: false, zulaessig: true, hinweis: "kein Antrag" });
    expect(verstoesse(entscheidung)).toEqual([{ id: "AM-R01", code: "kein-antrag" }]);
  });

  it("AM-AK-02 Antrag und Änderung an der Spezifikation: rot mit geschütztem Pfad", () => {
    const entscheidung = entscheideAutomerge(
      pr({ dateien: [{ pfad: "docs/01-spezifikation.md", status: "M", zeilen: 3 }] }),
    );
    expect(entscheidung.zulaessig).toBe(false);
    expect(verstoesse(entscheidung)).toEqual([
      { id: "AM-R04", code: "geschuetzter-pfad", detail: "docs/01-spezifikation.md" },
    ]);
  });

  it("AM-AK-03 PR aus einem Fork: rot mit „PR von außen“", () => {
    expect(verstoesse(entscheideAutomerge(pr({ vonAussen: true })))).toEqual([
      { id: "Herkunft", code: "pr-von-aussen" },
    ]);
  });

  it("AM-AK-04 nicht abgehakter Punkt unter „Bitte bestätigen“: rot und nennt den Punkt", () => {
    const beschreibung =
      "## Bitte bestätigen\n\n- [x] Schon erledigt\n- [ ] Tabellenname report_day\n\n## Prüfung\n- [ ] egal";
    expect(verstoesse(entscheideAutomerge(pr({ beschreibung })))).toEqual([
      { id: "AM-R05", code: "offene-frage", detail: "Tabellenname report_day" },
    ]);
  });

  it("AM-AK-04 nummerierte Frage ohne Checkbox: rot mit offene-frage", () => {
    const beschreibung = "## Bitte bestätigen:\n\n1. Soll die Spalte report_day heißen?\n2. [x] Erledigt\n";
    const entscheidung = entscheideAutomerge(pr({ beschreibung }));
    expect(entscheidung.zulaessig).toBe(false);
    expect(verstoesse(entscheidung)).toEqual([
      { id: "AM-R05", code: "offene-frage", detail: "Soll die Spalte report_day heißen?" },
    ]);
  });

  it("AM-AK-04 jeder Listenpunkt zählt, auch eingerückt und ohne Checkbox; nur [x] oder [X] ist erledigt", () => {
    const beschreibung = [
      "#### Bitte bestätigen",
      "- Frage ohne Checkbox",
      "  * Unterpunkt",
      "+ [ ] Plus mit Checkbox",
      "- [X] Groß abgehakt",
      "- [x] klein abgehakt",
      "3) Klammer-Nummer",
      "Freitext ist kein Listenpunkt",
      "## Prüfung",
      "- danach nicht mehr",
    ].join("\n");
    expect(offenePunkte(beschreibung)).toEqual([
      "Frage ohne Checkbox",
      "Unterpunkt",
      "Plus mit Checkbox",
      "Klammer-Nummer",
    ]);
  });

  it("AM-AK-04 abgehakter Punkt - [x]: kein Grund", () => {
    const entscheidung = entscheideAutomerge(pr({ beschreibung: "## Bitte bestätigen\n\n- [x] Erledigt\n" }));
    expect(entscheidung.zulaessig).toBe(true);
    expect(entscheidung.kriterien.find(({ id }) => id === "AM-R05")).toMatchObject({ erfuellt: true, gruende: [] });
  });

  it("AM-AK-04 fette Zeile **Bitte bestätigen** wird als Überschrift erkannt", () => {
    const beschreibung = "Text\n\n**Bitte bestätigen**\n\n- Darf die Migration so bleiben?\n";
    expect(verstoesse(entscheideAutomerge(pr({ beschreibung })))).toEqual([
      { id: "AM-R05", code: "offene-frage", detail: "Darf die Migration so bleiben?" },
    ]);
    expect(offenePunkte("**Bitte bestätigen:**\n1. Frage")).toEqual(["Frage"]);
  });

  it("AM-AK-04 lange Punkte werden gekürzt genannt", () => {
    const [punkt] = offenePunkte(`## Bitte bestätigen\n- ${"x".repeat(300)}`);
    expect(punkt).toHaveLength(120);
    expect(punkt.endsWith("…")).toBe(true);
  });

  it("AM-AK-05 gelöschter Test, neues .skip oder weniger Tests zu einer ID: rot und nennt Datei bzw. ID", () => {
    const entscheidung = entscheideAutomerge(
      pr({
        dateien: [
          { pfad: "src/domain/weeks.test.ts", status: "D", zeilen: 50 },
          { pfad: "e2e/helpers.ts", status: "M", zeilen: 2, neueZeilen: ["  test.skip(true, 'später');"] },
          { pfad: "src/lib/reports.ts", status: "M", zeilen: 2, neueZeilen: ["items.skip = true;"] },
        ],
        testsVorher: { "AK-401": 3, "UI-AK-02": 1 },
        testsNachher: { "AK-401": 2, "UI-AK-02": 1 },
      }),
    );
    expect(verstoesse(entscheidung)).toEqual([
      { id: "AM-R06", code: "testdatei-geloescht", detail: "src/domain/weeks.test.ts" },
      { id: "AM-R06", code: "test-uebersprungen", detail: "e2e/helpers.ts" },
      { id: "AM-R06", code: "weniger-tests", detail: "AK-401" },
    ]);
    expect(entscheidung.kriterien.find(({ id }) => id === "AM-R06")?.gruende[2]).toMatchObject({
      vorher: 3,
      nachher: 2,
    });
  });

  it("AM-AK-05 umbenannte Testdatei und entfernter Prüffall sind ebenfalls rot", () => {
    const entscheidung = entscheideAutomerge(
      pr({
        dateien: [{ pfad: "tests/db/neu.test.ts", alterPfad: "tests/db/alt.test.ts", status: "R", zeilen: 0 }],
        prueffaelleVorher: ["AK-503-01", "AK-503-02"],
        prueffaelleNachher: ["AK-503-01"],
      }),
    );
    expect(verstoesse(entscheidung)).toEqual([
      { id: "AM-R06", code: "testdatei-umbenannt", detail: "tests/db/alt.test.ts" },
      { id: "AM-R06", code: "prueffall-entfernt", detail: "AK-503-02" },
    ]);
  });

  it("AM-AK-06 Abnahme fehlt, ist veraltet oder ohne Schreibrecht: rot", () => {
    expect(verstoesse(entscheideAutomerge(pr({ kommentare: [] })))).toEqual([{ id: "AM-R07", code: "abnahme-fehlt" }]);
    expect(
      verstoesse(
        entscheideAutomerge(
          pr({ kommentare: [{ text: "<!-- abnahme-steuerung sha=fedcba9 -->", schreibrecht: true }] }),
        ),
      ),
    ).toEqual([{ id: "AM-R07", code: "abnahme-veraltet", detail: "fedcba9" }]);
    expect(verstoesse(entscheideAutomerge(pr({ kommentare: [{ ...ABNAHME, schreibrecht: false }] })))).toEqual([
      { id: "AM-R07", code: "abnahme-ohne-schreibrecht" },
    ]);
  });

  it("AM-AK-06 Markierung ohne sha= oder mit ungültigem sha=: abnahme-ohne-sha", () => {
    for (const text of [
      "Abnahme bestanden.\n<!-- abnahme-steuerung -->",
      "<!-- abnahme-steuerung sha= -->",
      "<!-- abnahme-steuerung sha=xyz1234 -->",
      "<!-- abnahme-steuerung sha=abc12 -->",
    ]) {
      expect(verstoesse(entscheideAutomerge(pr({ kommentare: [{ text, schreibrecht: true }] })))).toEqual([
        { id: "AM-R07", code: "abnahme-ohne-sha" },
      ]);
    }
  });

  it("AM-AK-06 gültiges, aber fremdes sha=: abnahme-veraltet; passendes sha=: erfüllt", () => {
    const fremd = { text: `<!-- abnahme-steuerung sha=${"f".repeat(40)} -->`, schreibrecht: true };
    expect(verstoesse(entscheideAutomerge(pr({ kommentare: [fremd] })))).toEqual([
      { id: "AM-R07", code: "abnahme-veraltet", detail: "f".repeat(40) },
    ]);
    const passend = entscheideAutomerge(pr({ kommentare: [fremd, ABNAHME] }));
    expect(passend.zulaessig).toBe(true);
    expect(passend.kriterien.find(({ id }) => id === "AM-R07")).toMatchObject({ erfuellt: true, gruende: [] });
  });

  it("AM-AK-06 eine Abnahme mit gekürztem Stand (7 Zeichen) gilt", () => {
    const kurz = { text: `<!-- abnahme-steuerung sha=${SHA.slice(0, 7)} -->`, schreibrecht: true };
    expect(entscheideAutomerge(pr({ kommentare: [kurz] })).zulaessig).toBe(true);
  });

  it("AM-AK-07 Dependabot: Patch-Update zulässig, Major-Update rot", () => {
    const dependabot = {
      autor: "dependabot[bot]",
      kommentare: [],
      dateien: [
        { pfad: "package.json", status: "M" as const, zeilen: 2 },
        { pfad: "package-lock.json", status: "M" as const, zeilen: 80 },
      ],
    };
    expect(entscheideAutomerge(pr({ ...dependabot, titel: "Bump next from 16.3.8 to 16.3.9" })).zulaessig).toBe(true);
    expect(verstoesse(entscheideAutomerge(pr({ ...dependabot, titel: "Bump next from 16.3.8 to 17.0.0" })))).toEqual([
      { id: "AM-R09", code: "major-version", detail: "next" },
    ]);
  });

  it("AM-AK-07 Dependabot: Minor nur für Entwicklungsabhängigkeiten, Gruppen-Updates gibt Chris frei", () => {
    expect(pruefeDependabot("Bump vitest from 3.1.0 to 3.2.0", ["next"])).toEqual([]);
    expect(pruefeDependabot("Bump next from 16.3.8 to 16.4.0", ["next"])).toEqual([
      { code: "minor-laufzeit", detail: "next", von: "16.3.8", nach: "16.4.0" },
    ]);
    expect(pruefeDependabot("Bump the npm group with 3 updates", ["next"])).toMatchObject([
      { code: "dependabot-nicht-auswertbar" },
    ]);
  });

  it("AM-AK-08 mehr als 1.500 geänderte Zeilen: rot; Lockfile und erzeugte Datei zählen nicht", () => {
    const gross = entscheideAutomerge(pr({ dateien: [{ pfad: "src/lib/a.ts", status: "A", zeilen: 1501 }] }));
    expect(verstoesse(gross)).toEqual([{ id: "AM-R10", code: "zu-gross", detail: "1501" }]);
    const ohneErzeugte = entscheideAutomerge(
      pr({
        dateien: [
          { pfad: "src/lib/a.ts", status: "A", zeilen: 1500 },
          { pfad: "docs/03-testabdeckung.md", status: "M", zeilen: 900 },
        ],
      }),
    );
    expect(ohneErzeugte.zulaessig).toBe(true);
  });

  it("AM-AK-09 main rot oder Schalter aus: rot mit Grund; der Revert ist trotz rotem main zulässig", () => {
    expect(verstoesse(entscheideAutomerge(pr({ mainGruen: false })))).toEqual([{ id: "AM-R11", code: "main-rot" }]);
    const aus = entscheideAutomerge(pr({ schalterAn: false }));
    expect(aus).toMatchObject({ zulaessig: false, zulaessigOhneSchalter: true });
    expect(verstoesse(aus)).toEqual([{ id: "AM-R12", code: "schalter-aus" }]);
    const revert = entscheideAutomerge(
      pr({
        labels: ["automerge", "revert"],
        mainGruen: false,
        kommentare: [],
        dateien: [{ pfad: "prisma/schema.prisma", status: "M", zeilen: 4 }],
      }),
    );
    expect(revert.zulaessig).toBe(true);
  });

  it("AM-AK-10 mehrere Verstöße: alle werden genannt", () => {
    const entscheidung = entscheideAutomerge(
      pr({
        vonAussen: true,
        kommentare: [],
        mainGruen: false,
        schalterAn: false,
        dateien: [{ pfad: ".github/workflows/ci.yml", status: "M", zeilen: 1600 }],
      }),
    );
    expect(verstoesse(entscheidung)).toEqual([
      { id: "Herkunft", code: "pr-von-aussen" },
      { id: "AM-R04", code: "geschuetzter-pfad", detail: ".github/workflows/ci.yml" },
      { id: "AM-R07", code: "abnahme-fehlt" },
      { id: "AM-R10", code: "zu-gross", detail: "1600" },
      { id: "AM-R11", code: "main-rot" },
      { id: "AM-R12", code: "schalter-aus" },
    ]);
    expect(entscheidung.gruende).toHaveLength(6);
    expect(entscheidung.zulaessigOhneSchalter).toBe(false);
  });

  it("AM-AK-10 mehrere Verstöße erscheinen alle in kriterien, je Kriterium ein Eintrag", () => {
    const entscheidung = entscheideAutomerge(
      pr({
        beschreibung: "## Bitte bestätigen\n1. Erste Frage\n2. Zweite Frage",
        kommentare: [{ text: "<!-- abnahme-steuerung -->", schreibrecht: true }],
        schalterAn: false,
        dateien: [
          { pfad: "docs/01-spezifikation.md", status: "M", zeilen: 3 },
          { pfad: "specs/M05-status-und-pruefung.md", status: "M", zeilen: 3 },
        ],
      }),
    );
    const offen = entscheidung.kriterien.filter(({ erfuellt }) => !erfuellt);
    expect(offen.map(({ id }) => id)).toEqual(["AM-R04", "AM-R05", "AM-R07", "AM-R12"]);
    expect(verstoesse(entscheidung)).toEqual([
      { id: "AM-R04", code: "geschuetzter-pfad", detail: "docs/01-spezifikation.md" },
      { id: "AM-R04", code: "geschuetzter-pfad", detail: "specs/M05-status-und-pruefung.md" },
      { id: "AM-R05", code: "offene-frage", detail: "Erste Frage" },
      { id: "AM-R05", code: "offene-frage", detail: "Zweite Frage" },
      { id: "AM-R07", code: "abnahme-ohne-sha" },
      { id: "AM-R12", code: "schalter-aus" },
    ]);
    expect(new Set(entscheidung.kriterien.map(({ id }) => id)).size).toBe(entscheidung.kriterien.length);
  });

  it("Revert und Dependabot: entfallende Kriterien sind gekennzeichnet", () => {
    const revert = entscheideAutomerge(pr({ labels: ["automerge", "revert"], kommentare: [] }));
    expect(revert.kriterien.filter(({ entfaellt }) => entfaellt).map(({ id, entfaellt }) => [id, entfaellt])).toEqual([
      ["AM-R04", "revert"],
      ["AM-R07", "revert"],
      ["AM-R09", "kein-dependabot"],
      ["AM-R11", "revert"],
    ]);
  });

  it("Merge-Warteschlange: immer grün (AM-S02)", () => {
    expect(entscheideAutomerge(pr({ ereignis: "merge_group", schalterAn: false })).zulaessig).toBe(true);
  });
});

describe("Übersprungene Tests erkennen (AM-R06)", () => {
  const mitZeile = (zeile: string) =>
    entscheideAutomerge(pr({ dateien: [{ pfad: "e2e/a.spec.ts", status: "M", zeilen: 1, neueZeilen: [zeile] }] }))
      .gruende;

  it.each([
    ["  test.skip(true, 'später');"],
    ["it.only('nur dieser', () => {"],
    ["describe.skipIf(ci)('x', () => {"],
    ["  test.describe.fixme('x', () => {"],
    ["  test.fail();"],
    ["  @Disabled"],
  ])("%s wird erkannt", (zeile) => {
    expect(mitZeile(zeile)).toHaveLength(1);
  });

  it.each([
    ['const text = "test.skip(true) ist verboten";'],
    ["// it.only wird nicht genutzt"],
    ["  await page.getByRole('button', { name: 'Überspringen' }).click();"],
  ])("%s wird nicht erkannt", (zeile) => {
    expect(mitZeile(zeile)).toEqual([]);
  });
});

describe("istGeschuetzt (AM-R04)", () => {
  it.each([
    ["docs/07-spec-automatisches-mergen.md", true],
    ["specs/M05-status-und-pruefung.md", true],
    ["specs/pruefung/M05.json", true],
    ["specs/code-landkarte.md", false],
    [".claude/hooks/session-start.sh", true],
    ["src/lib/auth/config.ts", true],
    ["src/domain/access.ts", true],
    ["src/domain/weeks.ts", false],
    ["prisma/migrations/20261006130221_init/migration.sql", true],
    ["liferay-72/build.gradle", true],
    ["liferay-72/modules/report/build.gradle", false],
    ["liferay-72/modules/report/service.xml", false],
    ["AUFTRAG-ETAPPE-9.md", false],
    ["docs/04-demo-anleitung.md", false],
    ["scripts/merge-kriterien/index.mjs", true],
  ])("%s → %s", (pfad, erwartet) => {
    expect(istGeschuetzt(pfad)).toBe(erwartet);
  });
});

describe("Hilfsfunktionen", () => {
  it("offenePunkte: nur der Abschnitt „Bitte bestätigen“, nummerierte und Aufzählungspunkte", () => {
    expect(
      offenePunkte("### Bitte bestätigen\n1. [ ] Erster\n* [ ] Zweiter\n- [x] fertig\n## Weiter\n- [ ] nein"),
    ).toEqual(["Erster", "Zweiter"]);
    expect(offenePunkte("## Bitte bestätigen\n```sh\n# Kommentar\n```\n- noch im Abschnitt")).toEqual([
      "noch im Abschnitt",
    ]);
    expect(offenePunkte("## Bitte bestätigen\n\n---\n* * *\n")).toEqual([]);
    expect(offenePunkte("## Inhalt\n- [ ] kein Abschnitt")).toEqual([]);
  });

  it("testsJeAk: zählt Einträge je Zeile, „kein Test“ als 0, maskierte | im Text", () => {
    const markdown = [
      "| AK-ID | Kurztext | Tests | Ebene |",
      "| --- | --- | --- | --- |",
      "| AK-901 | PDF \\| Export | `a.test.ts`: eins<br>`b.test.ts`: zwei | Unit |",
      "| AK-902 | Text | **kein Test** | — |",
      "| UI-AK-03 | Text | `e2e/ui.spec.ts`: drei | Browser | Browser |",
    ].join("\n");
    expect(testsJeAk(markdown)).toEqual({ "AK-901": 2, "AK-902": 0, "UI-AK-03": 1 });
  });

  it("testsJeAk: erkennt auch AM-AK-Zeilen", () => {
    const markdown = [
      "| AM-AK-ID | Kurztext | Tests | Ebene (Soll) | Anzahl | Nachweis |",
      "| --- | --- | --- | --- | --- | --- |",
      "| AM-AK-03 | Fork | `a.test.ts`: AM-AK-03 eins<br>`a.test.ts`: AM-AK-03 zwei | Fachlogik | 2 |  |",
      "| AM-AK-11 | Ablauf | **kein Test** | Ablauf | 0 | Ablauf, Nachweis an Test-PRs (docs/07) |",
    ].join("\n");
    expect(testsJeAk(markdown)).toEqual({ "AM-AK-03": 2, "AM-AK-11": 0 });
  });

  it("testsJeAk: weniger Tests zu einer AM-AK-ID lösen den Verstoß aus AM-R06 aus", () => {
    const zeile = (n: number) =>
      `| AM-AK-03 | Fork | ${Array(n).fill("`a.test.ts`: AM-AK-03 x").join("<br>")} | Fachlogik |`;
    const entscheidung = entscheideAutomerge(
      pr({ testsVorher: testsJeAk(zeile(2)), testsNachher: testsJeAk(zeile(1)) }),
    );
    expect(verstoesse(entscheidung)).toEqual([{ id: "AM-R06", code: "weniger-tests", detail: "AM-AK-03" }]);
  });

  it("prueffallIds: liest die IDs aus dem JSON", () => {
    expect(prueffallIds('[{ "id": "AK-404-02", "modul": "M01" }, {"id":"AK-404-03"}]')).toEqual([
      "AK-404-02",
      "AK-404-03",
    ]);
  });
});

describe("Zusammenfassung (AM-S02)", () => {
  const ausgewertet = (bericht: string) =>
    bericht
      .split("\n")
      .filter((zeile) => /^\| (AM-R\d+|Herkunft) /.test(zeile))
      .map((zeile) => zeile.split(" ")[1]);

  it("die Tabelle enthält jede ausgewertete AM-R-ID genau einmal", () => {
    const bericht = erstelleBericht(
      entscheideAutomerge(
        pr({ schalterAn: false, dateien: [{ pfad: "scripts/merge-kriterien/index.mjs", status: "M", zeilen: 5 }] }),
      ),
    );
    expect(bericht).toContain("| Kriterium | Ergebnis | Grund |");
    expect(ausgewertet(bericht)).toEqual(Object.keys(KRITERIEN));
    expect(bericht).toMatch(
      /^\| AM-R04 .* \| nicht erfüllt \| geschützter Pfad: scripts\/merge-kriterien\/index\.mjs \|$/m,
    );
    expect(bericht).toMatch(/^\| AM-R12 .* \| nicht erfüllt \| .+ \|$/m);
    expect(bericht).toMatch(/^\| AM-R09 .* \| entfällt \| .+ \|$/m);
  });

  it("ohne Antrag nennt die Tabelle nur AM-R01", () => {
    const bericht = erstelleBericht(entscheideAutomerge(pr({ labels: [] })));
    expect(bericht).toContain("Ergebnis: **kein Antrag**");
    expect(ausgewertet(bericht)).toEqual(["AM-R01"]);
  });

  it("maskiert | in Gründen, damit die Tabelle hält", () => {
    const bericht = erstelleBericht(entscheideAutomerge(pr({ beschreibung: "## Bitte bestätigen\n- a | b" })));
    expect(bericht).toContain("a \\| b");
  });
});
