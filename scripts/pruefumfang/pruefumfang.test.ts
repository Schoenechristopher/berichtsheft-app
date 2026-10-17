import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { criterionOfCase, parseModuleCriteria } from "../ak-abdeckung/coverage";
import { CROSS_SECTION, sectionsByFile } from "../code-landkarte/landkarte.mjs";
import { loadCases } from "../../tests/pruefung/cases";
import {
  akModule,
  auswahlNachModul,
  IMMER_MIT,
  mitAbhaengigen,
  waehleAblauf,
  type Modulgraph,
} from "./modulauswahl.mjs";
import { bestimmeUmfang, klassifiziere, umfangNachKlassen, type Anlass } from "./pruefumfang.mjs";

describe("klassifiziere (docs/ci-richtlinie.md, Abschnitt 7)", () => {
  it.each([
    ["docs/01-spezifikation.md", "D"],
    ["README.md", "D"],
    ["specs/pruefung/format.md", "D"],
    ["playbooks/liferay-72/P05.md", "D"],
    ["specs/pruefung/M01.json", "P"],
    ["src/domain/weeks.ts", "L"],
    ["src/lib/reports.ts", "L"],
    ["src/auth.ts", "L"],
    ["prisma/migrations/20261006130221_init/migration.sql", "L"],
    ["scripts/pruefumfang/pruefumfang.mjs", "L"],
    ["tests/db/people.test.ts", "L"],
    ["src/app/globals.css", "O"],
    ["src/components/AppShell.tsx", "O"],
    ["e2e/helpers.ts", "O"],
    ["playwright.config.ts", "O"],
    ["package-lock.json", "I"],
    [".github/workflows/ci.yml", "I"],
    [".claude/hooks/session-start.sh", "I"],
    ["docker/start-app.sh", "I"],
    ["liferay-625/portlets/build.xml", "L62"],
    ["liferay-72/modules/report/build.gradle", "L72"],
    ["src/neu.ts", "unbekannt"],
    ["irgendwas.txt", "unbekannt"],
  ])("%s → %s", (pfad, klasse) => {
    expect(klassifiziere(pfad)).toBe(klasse);
  });

  it("ordnet nur ganze Ordner zu, keine Namensanfänge", () => {
    expect(klassifiziere("src/domainx/a.ts")).toBe("unbekannt");
    expect(klassifiziere("docsx/a.txt")).toBe("unbekannt");
  });
});

describe("umfangNachKlassen (CI-32, CI-34)", () => {
  it("Doku allein: nur schnelle Prüfung (CI-12)", () => {
    expect(umfangNachKlassen(["docs/ci-richtlinie.md", "README.md"])).toMatchObject({
      schnell: true,
      e2e: false,
      browserVoll: false,
    });
  });

  it("Logik und Doku: Chromium und 375 px, keine weiteren Browser", () => {
    expect(umfangNachKlassen(["docs/x.md", "src/domain/weeks.ts"])).toMatchObject({
      schnell: true,
      e2e: true,
      browserVoll: false,
    });
  });

  it("Prüffälle: wie Logik, Liferay nicht", () => {
    expect(umfangNachKlassen(["specs/pruefung/M05.json"])).toMatchObject({
      e2e: true,
      browserVoll: false,
      liferay625: false,
      liferay72: false,
    });
  });

  it.each([["src/components/AppShell.tsx"], ["package-lock.json"], ["src/neu.ts"]])(
    "%s: alle Browser, axe und Screenshots",
    (pfad) => {
      expect(umfangNachKlassen([pfad])).toMatchObject({ schnell: true, e2e: true, browserVoll: true });
    },
  );

  it("Liferay: nur der Job der jeweiligen Umsetzung, keine Browser-Tests der TypeScript-App", () => {
    expect(umfangNachKlassen(["liferay-72/modules/a.java"])).toMatchObject({
      e2e: false,
      liferay625: false,
      liferay72: true,
    });
  });

  it("nennt die Klassen im Grund", () => {
    expect(umfangNachKlassen(["src/lib/a.ts", "docs/b.md"]).grund).toBe("Änderungsklassen: D, L");
  });
});

describe("bestimmeUmfang (CI-10 bis CI-14, CI-35)", () => {
  const logik = ["src/domain/weeks.ts"];

  it("Entwurf: nur schnelle Prüfung, auch bei Code-Änderungen (CI-10)", () => {
    expect(bestimmeUmfang({ ereignis: "pull_request", entwurf: true, dateien: ["src/app/page.tsx"] })).toMatchObject({
      schnell: true,
      e2e: false,
    });
  });

  it("bereiter PR: Umfang nach Klassen (CI-11, CI-32)", () => {
    expect(bestimmeUmfang({ ereignis: "pull_request", entwurf: false, dateien: logik })).toMatchObject({
      e2e: true,
      browserVoll: false,
    });
  });

  it("Label volle-pruefung: alles, auch im Entwurf (CI-35)", () => {
    expect(
      bestimmeUmfang({ ereignis: "pull_request", entwurf: true, labels: ["volle-pruefung"], dateien: ["docs/a.md"] }),
    ).toMatchObject({ schnell: true, e2e: true, browserVoll: true, liferay625: true, liferay72: true });
  });

  it("Label automerge: mindestens Chromium und 375 px, auch bei reiner Doku (AM-R08)", () => {
    expect(
      bestimmeUmfang({ ereignis: "pull_request", entwurf: false, labels: ["automerge"], dateien: ["docs/a.md"] }),
    ).toMatchObject({ schnell: true, e2e: true, browserVoll: false });
    expect(
      bestimmeUmfang({ ereignis: "pull_request", entwurf: false, labels: ["automerge"], dateien: ["src/app/x.tsx"] }),
    ).toMatchObject({ e2e: true, browserVoll: true });
  });

  describe("Liferay-Jobs und AM-R08 für reine Liferay-PRs", () => {
    type Erwartet = {
      e2e: boolean;
      liferay625: boolean;
      liferay72: boolean;
      liferay625Voll: boolean;
      liferay72Voll: boolean;
    };
    const bereit = (dateien: string[], labels: string[] = []): Anlass => ({
      ereignis: "pull_request",
      entwurf: false,
      labels,
      dateien,
    });
    const faelle: [string, Anlass, Erwartet][] = [
      [
        "L62 allein mit automerge: -voll-Job statt Compose",
        bereit(["liferay-625/ci/schnell.sh", "docs/a.md"], ["automerge"]),
        { e2e: false, liferay625: true, liferay72: false, liferay625Voll: true, liferay72Voll: false },
      ],
      [
        "L72 allein mit automerge: -voll-Job statt Compose",
        bereit(["liferay-72/ci/voll.sh"], ["automerge"]),
        { e2e: false, liferay625: false, liferay72: true, liferay625Voll: false, liferay72Voll: true },
      ],
      [
        "L62 und L72 mit automerge: beide -voll-Jobs",
        bereit(["liferay-625/a.java", "liferay-72/b.java"], ["automerge"]),
        { e2e: false, liferay625: true, liferay72: true, liferay625Voll: true, liferay72Voll: true },
      ],
      [
        "L62 mit src/ und automerge: Klasse L, zusätzlich Compose",
        bereit(["liferay-625/a.java", "src/domain/weeks.ts"], ["automerge"]),
        { e2e: true, liferay625: true, liferay72: false, liferay625Voll: true, liferay72Voll: false },
      ],
      [
        "Doku mit automerge: bleibt Klasse L, kein Liferay-Job",
        bereit(["docs/a.md"], ["automerge"]),
        { e2e: true, liferay625: false, liferay72: false, liferay625Voll: false, liferay72Voll: false },
      ],
      [
        "Pfad upgrade-625-auf-72 mit automerge: Klasse U, nicht rein Liferay, daher Klasse L, kein Liferay-Job",
        bereit(["upgrade-625-auf-72/ci/lauf.sh"], ["automerge"]),
        { e2e: true, liferay625: false, liferay72: false, liferay625Voll: false, liferay72Voll: false },
      ],
      [
        "L62 ohne automerge, bereit: -voll-Job (CI-11), kein Compose",
        bereit(["liferay-625/a.java"]),
        { e2e: false, liferay625: true, liferay72: false, liferay625Voll: true, liferay72Voll: false },
      ],
      [
        "L62 im Entwurf: nur der -schnell-Job (CI-09, CI-10)",
        { ...bereit(["liferay-625/a.java"]), entwurf: true },
        { e2e: false, liferay625: true, liferay72: false, liferay625Voll: false, liferay72Voll: false },
      ],
      [
        "L72 in der Merge-Warteschlange: -voll-Job (CI-35)",
        { ereignis: "merge_group", dateien: ["liferay-72/a.java"] },
        { e2e: false, liferay625: false, liferay72: true, liferay625Voll: false, liferay72Voll: true },
      ],
      [
        "Wochenlauf: alle vier Liferay-Jobs",
        { ereignis: "schedule", tageSeitLetztemCommit: 1 },
        { e2e: true, liferay625: true, liferay72: true, liferay625Voll: true, liferay72Voll: true },
      ],
    ];
    it.each(faelle)("%s", (_name, anlass, erwartet) => {
      expect(bestimmeUmfang(anlass)).toMatchObject(erwartet);
    });

    it("Klasse U allein: kein Liferay-Job, schnelle Prüfung wie immer (CI-34)", () => {
      expect(klassifiziere("upgrade-625-auf-72/ci/lauf.sh")).toBe("U");
      expect(umfangNachKlassen(["upgrade-625-auf-72/ci/lauf.sh"])).toMatchObject({
        schnell: true,
        e2e: false,
        liferay625: false,
        liferay72: false,
        liferay625Voll: false,
        liferay72Voll: false,
      });
    });
  });

  it("main nach dem Merge: nur schnelle Prüfung (CI-13)", () => {
    expect(bestimmeUmfang({ ereignis: "push", dateien: ["src/app/page.tsx"] })).toMatchObject({
      schnell: true,
      e2e: false,
    });
  });

  it("Merge-Warteschlange: Umfang nach Klassen", () => {
    expect(bestimmeUmfang({ ereignis: "merge_group", dateien: ["src/components/a.tsx"] })).toMatchObject({
      e2e: true,
      browserVoll: true,
    });
  });

  it("Wochenlauf mit neuem Commit: alles; ohne neuen Commit seit 7 Tagen: nichts (CI-14)", () => {
    expect(bestimmeUmfang({ ereignis: "schedule", tageSeitLetztemCommit: 2 })).toMatchObject({
      schnell: true,
      e2e: true,
      browserVoll: true,
      liferay625: true,
      liferay72: true,
    });
    expect(bestimmeUmfang({ ereignis: "schedule", tageSeitLetztemCommit: 8 })).toMatchObject({
      schnell: false,
      e2e: false,
    });
  });

  it("Start von Hand: voll als Standard, auf Wunsch nach Klassen (CI-35)", () => {
    expect(bestimmeUmfang({ ereignis: "workflow_dispatch" })).toMatchObject({ e2e: true, browserVoll: true });
    expect(bestimmeUmfang({ ereignis: "workflow_dispatch", auswahl: "klassen", dateien: ["docs/a.md"] })).toMatchObject(
      {
        schnell: true,
        e2e: false,
      },
    );
  });
});

describe("CI-37 Auswahl der Ablauf-Fälle nach Modul (modulauswahl.mjs)", () => {
  const lies = (datei: string) => readFileSync(datei, "utf8");
  const graph = JSON.parse(lies("specs/modulgraph.json")) as Modulgraph;
  const specs = readdirSync("specs")
    .filter((datei) => /^(M\d{2}|Q)-.*\.md$/.test(datei))
    .map((datei) => ({ datei, markdown: lies(`specs/${datei}`) }));
  const kontext = {
    graph,
    landkarte: sectionsByFile(lies("specs/code-landkarte.md")),
    akModul: akModule(specs),
  };
  /** Wie Playwright: `--grep-invert "/…/"` gegen Datei, `describe`, Titel und Tags, mit Leerzeichen verbunden. */
  const laeuft = (muster: string, ...titel: string[]) =>
    muster === "" || !new RegExp(muster.slice(1, -1)).test(["", ...titel].join(" "));

  /** Kanten und Namen eines Mermaid-Diagramms im Abschnitt `abschnitt`: Modul → direkte Abhängigkeiten. */
  function mermaid(markdown: string, abschnitt: string) {
    const teil = markdown.slice(markdown.indexOf(abschnitt));
    const block = /```mermaid\n([\s\S]*?)```/.exec(teil)?.[1] ?? "";
    const abhaengig = new Map<string, string[]>();
    const namen = new Map<string, string>();
    for (const [, von, vonName, nach, nachName] of block.matchAll(
      /(\w+)(?:\["\w+ ([^"]+)"\])?\s*-->\s*(\w+)(?:\["\w+ ([^"]+)"\])?/g,
    )) {
      abhaengig.set(nach, [...(abhaengig.get(nach) ?? []), von].sort());
      if (!abhaengig.has(von)) abhaengig.set(von, []);
      if (vonName) namen.set(von, vonName);
      if (nachName) namen.set(nach, nachName);
    }
    return { abhaengig, namen };
  }

  it.each([
    ["specs/00-uebersicht.md", "## Abhängigkeiten"],
    ["docs/06-spec-architektur.md", "## Modulschnitt"],
  ])("CI-37 specs/modulgraph.json stimmt mit dem Mermaid-Diagramm in %s überein", (datei, abschnitt) => {
    const { abhaengig, namen } = mermaid(lies(datei), abschnitt);
    expect(abhaengig.size).toBe(10);
    for (const [modul, eintrag] of Object.entries(graph.module)) {
      expect([...eintrag.abhaengigVon].sort(), modul).toEqual(abhaengig.get(modul));
      expect(eintrag.name, modul).toBe(namen.get(modul));
    }
    expect(Object.keys(graph.module).sort()).toEqual([...abhaengig.keys()].sort());
  });

  it("CI-37 Modulgraph und Spalte „Hängt ab von“ in docs/06 („alle“ = transitiv alle übrigen Module)", () => {
    const zeilen = lies("docs/06-spec-architektur.md")
      .split("\n")
      .filter((zeile) => /^\| (M\d{2}|Q) /.test(zeile));
    expect(zeilen).toHaveLength(10);
    for (const zeile of zeilen) {
      const zellen = zeile.split("|").map((zelle) => zelle.trim());
      const modul = zellen[1].split(" ")[0];
      const spalte = zellen[5];
      const vorgaenger = Object.keys(graph.module).filter(
        (anderes) => anderes !== modul && mitAbhaengigen(graph, anderes).has(modul),
      );
      if (spalte === "alle") {
        expect(vorgaenger, modul).toEqual(Object.keys(graph.module).filter((m) => m !== modul && m !== "Q"));
      } else {
        const direkt = spalte === "–" ? [] : spalte.split(", ");
        expect([...graph.module[modul].abhaengigVon].sort(), modul).toEqual(direkt);
      }
    }
  });

  it("CI-37 jedes Modul im Graph steht in der Code-Landkarte und umgekehrt (Q ohne eigenen Abschnitt, Querschnitt ohne Modul)", () => {
    const abschnitte = [...lies("specs/code-landkarte.md").matchAll(/^## (M\d{2}|Querschnitt)\b/gm)].map((m) => m[1]);
    expect(abschnitte.filter((a) => a !== CROSS_SECTION).sort()).toEqual(
      Object.keys(graph.module).filter((modul) => modul !== "Q"),
    );
    expect(abschnitte).toContain(CROSS_SECTION);
    const inLandkarte = new Set([...kontext.landkarte.values()].flatMap((menge) => [...menge]));
    expect([...inLandkarte].sort()).toEqual([...abschnitte].sort());
  });

  it("CI-37 AK-Zuordnung wie die AK-Abdeckung; jeder Ablauf-Fall trägt das Modul seiner AK-ID", () => {
    for (const { datei, markdown } of specs) {
      const modul = datei.split("-")[0];
      const ids = [...kontext.akModul].filter(([, m]) => m === modul).map(([id]) => id);
      expect(ids, datei).toEqual(parseModuleCriteria(markdown));
    }
    const ablauf = loadCases().filter(({ entry }) => entry.ebene === "ablauf");
    expect(ablauf.length).toBeGreaterThan(0);
    for (const { file, entry } of ablauf) {
      expect(kontext.akModul.get(criterionOfCase(entry.id) ?? ""), `${file}: ${entry.id}`).toBe(entry.modul);
    }
  });

  it("CI-37 M01-Datei wählt M01 und alle Module, die laut Graph transitiv davon abhängen, sonst keins", () => {
    const auswahl = auswahlNachModul(["src/domain/weeks.ts"], kontext);
    expect(auswahl).toMatchObject({
      alle: false,
      module: ["M01", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "Q"],
    });
    expect(auswahl.gruende).toEqual([
      "modul:M01",
      "abhaengig:M03",
      "abhaengig:M04",
      "abhaengig:M05",
      "abhaengig:M06",
      "abhaengig:M07",
      "abhaengig:M08",
      "abhaengig:M09",
      "abhaengig:Q",
    ]);
    // Fälle von M02 fallen weg, Fälle der abhängigen Module (z. B. M08) laufen.
    expect(laeuft(auswahl.grepInvert, "ak-101-anmeldung.spec.ts", "Anmeldung", "AK-101 nach der Anmeldung")).toBe(
      false,
    );
    expect(
      laeuft(auswahl.grepInvert, "pruefung-ablauf.spec.ts", "Neutrale Prüffälle", "AK-101-02 (M02.json, ablauf)"),
    ).toBe(false);
    expect(laeuft(auswahl.grepInvert, "ak-1001-1025.spec.ts", "Benachrichtigungen", "AK-1003 Link")).toBe(true);
    expect(
      laeuft(auswahl.grepInvert, "pruefung-ablauf.spec.ts", "Neutrale Prüffälle", "AK-1201-01 (M01.json, ablauf)"),
    ).toBe(true);
  });

  it("CI-37 M08-Datei: M08, M09 und Q; Fall mit IDs mehrerer Module läuft, wenn eins gewählt ist", () => {
    const auswahl = auswahlNachModul(["src/domain/notifications.ts"], kontext);
    expect(auswahl).toMatchObject({ alle: false, module: ["M08", "M09", "Q"] });
    const m = auswahl.grepInvert;
    expect(laeuft(m, "ak-301-408.spec.ts", "Berichte erfassen", "AK-408 AK-901 PDF-Download")).toBe(false);
    expect(
      laeuft(m, "beispielszenarien.spec.ts", "Beispielszenarien", "Einreichen scheitert", "@AK-404", "@AK-501"),
    ).toBe(false);
    expect(laeuft(m, "beispielszenarien.spec.ts", "Beispielszenarien", "Ablauf", "@AK-1021", "@AK-1022")).toBe(true);
    expect(laeuft(m, "ak-501-803.spec.ts", "Einreichen", "AK-703 AK-1002 Rücknahme")).toBe(true);
    // AK-1011 ist M08, AK-101 (M02) darf nicht als Teil davon gelten und umgekehrt.
    expect(laeuft(m, "x.spec.ts", "AK-1011 Kanäle")).toBe(true);
    expect(laeuft(m, "x.spec.ts", "AK-101 Anmeldung")).toBe(false);
    expect(laeuft(m, "x.spec.ts", "UI-AK-10 Prüfansicht")).toBe(true);
  });

  it("CI-37 Fälle ohne eindeutiges Modul laufen immer mit", () => {
    const m = auswahlNachModul(["src/domain/notifications.ts"], kontext).grepInvert;
    expect(laeuft(m, "feinschliff.spec.ts", "Feinschliff", "leere Prüfliste erklärt, wo Berichte stehen")).toBe(true);
    expect(laeuft(m, "produktionsmodus.spec.ts", "Produktionsmodus", "AK-101 kein Test-Login")).toBe(true);
    expect(laeuft(m, "produktionsmodus.spec.ts", "Produktionsmodus", "AK-1201 keine Testschnittstelle")).toBe(true);
    expect(laeuft(m, "pruefung-ablauf.spec.ts", "Neutrale Prüffälle", "es gibt Ablauf-Fälle")).toBe(true);
    for (const datei of IMMER_MIT) {
      expect(laeuft(m, datei, "AK-101 AK-1201 irgendwas"), datei).toBe(true);
    }
  });

  it("CI-37 eine geänderte Spec-Datei unter e2e/ wählt mindestens sich selbst", () => {
    const auswahl = auswahlNachModul(["src/domain/notifications.ts", "e2e/ak-101-anmeldung.spec.ts"], kontext);
    expect(auswahl.gruende).toContain("datei:e2e/ak-101-anmeldung.spec.ts");
    expect(laeuft(auswahl.grepInvert, "ak-101-anmeldung.spec.ts", "Anmeldung", "AK-101 Firmenkonto")).toBe(true);
    expect(laeuft(auswahl.grepInvert, "ak-102-kein-zugang.spec.ts", "Abgewiesen", "AK-102 Hinweis")).toBe(false);
  });

  it.each([
    [["src/neu.ts"], "alle:unbekannte-datei"],
    [["src/worker/index.ts"], "alle:unbekannte-datei"],
    [["specs/pruefung/M05.json"], "alle:unbekannte-datei"],
    [["src/lib/db.ts"], "alle:querschnitt"],
    [["src/domain/weeks.ts", "src/lib/ids.ts"], "alle:querschnitt"],
    [["e2e/helpers.ts"], "alle:testgeruest"],
    [["e2e/pruefung/ablauf-adapter.ts"], "alle:testgeruest"],
    [["tests/pruefung/cases.ts"], "alle:testgeruest"],
    [["playwright.config.ts"], "alle:testgeruest"],
    [["docs/a.md", "README.md"], "alle:ohne-modul-datei"],
  ])("CI-37 %j wählt alle Fälle (%s)", (dateien, grund) => {
    expect(auswahlNachModul(dateien, kontext)).toEqual({ alle: true, module: [], gruende: [grund], grepInvert: "" });
  });

  it("CI-37 Doku zählt nicht: M08 und Doku wählt wie M08 allein", () => {
    expect(auswahlNachModul(["docs/a.md", "src/domain/notifications.ts"], kontext)).toEqual(
      auswahlNachModul(["src/domain/notifications.ts"], kontext),
    );
  });

  it("CI-37 reine Doku ändert am bisherigen Umfang nichts, auch nicht mit Label automerge", () => {
    const anlass: Anlass = { ereignis: "pull_request", entwurf: false, dateien: ["docs/a.md"] };
    expect(bestimmeUmfang(anlass)).toMatchObject({ schnell: true, e2e: false, browserVoll: false });
    const automerge = bestimmeUmfang({ ...anlass, labels: ["automerge"] });
    expect(automerge).toMatchObject({ e2e: true, browserVoll: false });
    expect(waehleAblauf(automerge, anlass.dateien ?? [], kontext)).toMatchObject({ alle: true, grepInvert: "" });
  });

  it("CI-37 gilt nur für Logik und Server: Oberfläche, Infrastruktur und unbekannte Pfade wählen alle Fälle", () => {
    const dateien = ["src/domain/notifications.ts", "src/components/AppShell.tsx", "package.json", "neu.txt"];
    const umfang = bestimmeUmfang({ ereignis: "pull_request", entwurf: false, dateien });
    expect(waehleAblauf(umfang, dateien, kontext)).toEqual({
      alle: true,
      module: [],
      gruende: ["alle:klasse-I", "alle:klasse-O", "alle:klasse-unbekannt"],
      grepInvert: "",
    });
  });

  it.each<[Anlass]>([
    [{ ereignis: "schedule", tageSeitLetztemCommit: 1 }],
    [{ ereignis: "pull_request", entwurf: false, labels: ["volle-pruefung"] }],
    [{ ereignis: "workflow_dispatch", auswahl: "voll" }],
  ])("CI-37 CI-35 erzwungen voll: alle Fälle (%j)", (anlass) => {
    const dateien = ["src/domain/notifications.ts"];
    expect(waehleAblauf(bestimmeUmfang({ ...anlass, dateien }), dateien, kontext)).toMatchObject({
      alle: true,
      gruende: ["alle:erzwungen"],
    });
  });

  it("CI-37 Merge-Warteschlange und Start von Hand „klassen“ wählen wie der PR", () => {
    const dateien = ["src/domain/notifications.ts", "docs/a.md"];
    const amPr = waehleAblauf(bestimmeUmfang({ ereignis: "pull_request", entwurf: false, dateien }), dateien, kontext);
    expect(amPr.alle).toBe(false);
    expect(waehleAblauf(bestimmeUmfang({ ereignis: "merge_group", dateien }), dateien, kontext)).toEqual(amPr);
    expect(
      waehleAblauf(bestimmeUmfang({ ereignis: "workflow_dispatch", auswahl: "klassen", dateien }), dateien, kontext),
    ).toEqual(amPr);
  });

  it("CI-37 ohne Browser-Lauf (Entwurf, Doku) keine Auswahl", () => {
    const dateien = ["src/domain/notifications.ts"];
    const entwurf = bestimmeUmfang({ ereignis: "pull_request", entwurf: true, dateien });
    expect(waehleAblauf(entwurf, dateien, kontext)).toMatchObject({
      gruende: ["keine:ohne-browser-lauf"],
      grepInvert: "",
    });
  });

  it("CI-37 specs/modulgraph.json gehört zur Klasse L", () => {
    expect(klassifiziere("specs/modulgraph.json")).toBe("L");
  });
});
