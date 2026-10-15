import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkDocument, kindOf, repositoryPath, type Context, type Finding } from "./pruefung";

const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8");

const context: Context = {
  moduleCriteria: new Map([
    ["M05", ["AK-501", "AK-505", "AK-508"]],
    ["Q", ["AK-1101"]],
  ]),
  caseIds: new Set(["AK-501-01", "AK-505-01"]),
  pathExists: (file) => ["specs/M05-status.md", "specs", ".claude/"].includes(file),
};

const reasons = (findings: Finding[]) => findings.map((finding) => `${finding.reason} ${finding.detail}`);

const ORDER = "auftraege/x.md";
const PLAYBOOK = "playbooks/typescript/P05-status.md";
const PROFILE = "profile/typescript-nextjs.md";

describe("Auftrag", () => {
  it("KE-AK-01 vollständiger Auftrag hat keine Befunde", () => {
    expect(checkDocument(ORDER, fixture("auftrag-vollstaendig.md"), context, true)).toEqual([]);
  });

  it("KE-AK-01 fehlender Abschnitt wird gemeldet", () => {
    const markdown = fixture("auftrag-vollstaendig.md").replace("## Prüfbefehle\n`npm test`\n", "");
    expect(reasons(checkDocument(ORDER, markdown, context, true))).toEqual(["fehlender-abschnitt Prüfbefehle"]);
  });

  it("KE-AK-01 leerer Abschnitt wird gemeldet", () => {
    const markdown = fixture("auftrag-vollstaendig.md").replace("- keine bekannt\n", "");
    expect(reasons(checkDocument(ORDER, markdown, context, true))).toEqual(["leerer-abschnitt Bekannte Fallen"]);
  });

  it("KE-AK-01 Fertig-Kriterium ohne Prüffall- oder AK-ID wird gemeldet", () => {
    const markdown = fixture("auftrag-vollstaendig.md").replace("AK-501-01 grün ist", "alles grün ist");
    expect(reasons(checkDocument(ORDER, markdown, context, true))).toEqual([
      "fehlende-pruef-id Ziel und Fertig-Kriterium",
    ]);
  });

  it("KE-AK-01 „keine Prüffälle“ zählt nur mit Begründung", () => {
    const base = fixture("auftrag-vollstaendig.md");
    const reasoned = base.replace("AK-501-01 grün ist", "die Doku steht; keine Prüffälle, weil reine Doku");
    const bare = base.replace("AK-501-01 grün ist.", "die Doku steht. Keine Prüffälle");
    expect(checkDocument(ORDER, reasoned, context, true)).toEqual([]);
    expect(reasons(checkDocument(ORDER, bare, context, true))).toEqual(["fehlende-pruef-id Ziel und Fertig-Kriterium"]);
  });

  it("KE-AK-01 Spec-AK wie KE-AK-01 zählt als Prüf-ID", () => {
    const markdown = fixture("auftrag-vollstaendig.md").replace("AK-501-01 grün ist", "KE-AK-01 erfüllt ist");
    expect(checkDocument(ORDER, markdown, context, true)).toEqual([]);
  });

  it("KE-AK-01 fehlende Stufe und fehlender Denkaufwand werden gemeldet", () => {
    const markdown = fixture("auftrag-vollstaendig.md").replace("Stufe S2, Denkaufwand mittel.", "Stufe offen.");
    expect(reasons(checkDocument(ORDER, markdown, context, true))).toEqual([
      "fehlende-stufe Branch, Stufe und Denkaufwand",
      "fehlender-denkaufwand Branch, Stufe und Denkaufwand",
    ]);
  });

  it("KE-AK-01 Budget ohne Betrag, harte Grenze und Diagnose-Grenze wird gemeldet", () => {
    const markdown = fixture("auftrag-vollstaendig.md").replace(
      "Richtwert 4–6 US-Dollar, harte Grenze 9 US-Dollar inkl. Diagnose, davon Diagnose höchstens 2.",
      "Größe klein.",
    );
    expect(reasons(checkDocument(ORDER, markdown, context, true))).toEqual([
      "fehlender-betrag Budget und Abbruch",
      "fehlende-harte-grenze Budget und Abbruch",
      "fehlende-diagnose-grenze Budget und Abbruch",
    ]);
  });

  it("Überschriften in Codeblöcken zählen nicht als Abschnitt", () => {
    const markdown = "# Auftrag\n\n```markdown\n## Ziel und Fertig-Kriterium\nAK-501-01\n```\n";
    expect(reasons(checkDocument(ORDER, markdown, context, true))).toContain(
      "fehlender-abschnitt Ziel und Fertig-Kriterium",
    );
  });
});

describe("Vorlage", () => {
  const template = (body: string) =>
    [
      "Ziel und Fertig-Kriterium",
      "Playbook und Schritt",
      "Dateien in Lesereihenfolge",
      "Prüfbefehle",
      "Branch, Stufe und Denkaufwand",
      "Budget und Abbruch",
      "Bekannte Fallen",
      "Erwartete Rückmeldung",
      "Gemeinsame Regeln für alle Pakete",
    ]
      .map((title) => `## ${title}\n${body}\n`)
      .join("\n");

  it("KE-AK-01 Vorlage braucht Abschnitte mit Ausfüllhinweis, aber keine ausgefüllten Werte", () => {
    expect(checkDocument("playbooks/vorlage-arbeitspaket.md", template("Ausfüllhinweis: …"), context)).toEqual([]);
    expect(checkDocument("playbooks/vorlage-arbeitspaket.md", template("Ausfüllhinweis: …"), context, true)).toEqual(
      [],
    );
  });

  it("KE-AK-01 Vorlage ohne Block „Gemeinsame Regeln“ wird gemeldet", () => {
    const markdown = template("Hinweis").replace(/## Gemeinsame Regeln[^\n]*\nHinweis\n/, "");
    expect(reasons(checkDocument("playbooks/vorlage-arbeitspaket.md", markdown, context))).toEqual([
      "fehlender-abschnitt Gemeinsame Regeln für alle Pakete",
    ]);
  });
});

describe("Playbook", () => {
  it("vollständiges Playbook mit allen AK-IDs seines Moduls hat keine Befunde", () => {
    const markdown = `${fixture("playbook-p05.md")}\nNachweis AK-508.\n`;
    expect(checkDocument(PLAYBOOK, markdown, context)).toEqual([]);
  });

  it("fehlende AK-ID des Moduls wird gemeldet", () => {
    expect(reasons(checkDocument(PLAYBOOK, fixture("playbook-p05.md"), context))).toEqual(["fehlende-ak-id AK-508"]);
  });

  it("P10 braucht die AK-IDs von Q, P00 und Unn keine", () => {
    const markdown = fixture("playbook-p05.md").replace("AK-501 und AK-505 grün.", "Alles grün.");
    expect(reasons(checkDocument("playbooks/liferay-72/P10-abnahme.md", markdown, context))).toEqual([
      "fehlende-ak-id AK-1101",
    ]);
    expect(checkDocument("playbooks/liferay-625/P00-grundgeruest.md", markdown, context)).toEqual([]);
    expect(checkDocument("playbooks/upgrade-625-auf-72/U03-daten.md", markdown, context)).toEqual([]);
  });

  it("fehlender Abschnitt und falsche Reihenfolge werden gemeldet", () => {
    const base = `${fixture("playbook-p05.md")}\nAK-508\n`;
    const missing = base.replace("## 6. Empfehlung\nWeg B.\n", "");
    const swapped = base.replace("## 3. Eingaben", "## 3. Tmp").replace("## 2. Voraussetzungen", "## 3. Eingaben");
    expect(reasons(checkDocument(PLAYBOOK, missing, context))).toEqual(["fehlender-abschnitt 6. Empfehlung"]);
    expect(reasons(checkDocument(PLAYBOOK, swapped.replace("## 3. Tmp", "## 2. Voraussetzungen"), context))).toEqual([
      "falsche-reihenfolge 3. Eingaben",
    ]);
  });

  it("unbekannte AK-ID und Prüffall-ID werden gemeldet", () => {
    const markdown = `${fixture("playbook-p05.md")}\nAK-508, AK-999, AK-501-77, UI-AK-01.\n`;
    expect(reasons(checkDocument(PLAYBOOK, markdown, context))).toEqual([
      "unbekannte-ak-id AK-999",
      "unbekannte-prueffall-id AK-501-77",
      "unbekannte-ak-id UI-AK-01",
    ]);
  });

  it("IDs anderer Specs wie KE-AK-01 oder AM-AK-02 werden nicht als AK-ID geprüft", () => {
    const markdown = `${fixture("playbook-p05.md")}\nAK-508, KE-AK-01, AM-AK-02, MW-R03.\n`;
    expect(checkDocument(PLAYBOOK, markdown, context)).toEqual([]);
  });
  it("KE-AK-06 und AM-AK-13 sind keine Fach-AK", () => {
    const markdown = `${fixture("playbook-p05.md")}\nAK-508; KE-AK-01, KE-AK-04, KE-AK-05, KE-AK-06, AM-AK-13, MW-AK-01, MW-AK-02.\n`;
    expect(checkDocument(PLAYBOOK, markdown, context)).toEqual([]);
    expect(checkDocument("playbooks/00-steuerung.md", "KE-AK-06 und AM-AK-13 (AM-AK-13-01)", context)).toEqual([]);
  });
});

describe("Profil", () => {
  it("vollständiges Profil hat keine Befunde", () => {
    expect(checkDocument(PROFILE, fixture("profil.md"), context)).toEqual([]);
  });

  it("Profil ohne Nachweis-Abschnitt wird gemeldet", () => {
    const markdown = fixture("profil.md").replace(/## Nachweis[\s\S]*$/, "");
    expect(reasons(checkDocument(PROFILE, markdown, context))).toEqual([
      "fehlender-abschnitt Nachweis AK-505 und AK-508",
    ]);
  });

  it("Nachweis-Abschnitt ohne AK-508 im Text wird gemeldet", () => {
    const markdown = fixture("profil.md").replace("AK-508 über einen Browser-Test.", "Rest offen.");
    expect(reasons(checkDocument(PROFILE, markdown, context))).toEqual(["fehlender-nachweis AK-508"]);
  });
});

describe("Pfade und Modellkennungen", () => {
  it("fehlender Repository-Pfad wird gemeldet, Ausnahmen nicht", () => {
    const markdown = [
      "`specs/M05-status.md` `specs/fehlt.md` `src/fehlt.ts:12`",
      "`specs/M0n-*.md` `playbooks/typescript/P01-x.md` `profile/liferay-gemeinsam.md` `liferay-72/modules/x`",
      "`npm test` `docs/<datei>.md`",
    ].join("\n");
    expect(reasons(checkDocument("playbooks/00-steuerung.md", markdown, context))).toEqual([
      "fehlender-pfad specs/fehlt.md",
      "fehlender-pfad src/fehlt.ts",
    ]);
  });

  it("repositoryPath erkennt nur einzelne Pfade mit bekanntem Anfang", () => {
    expect(repositoryPath("docs/ci-richtlinie.md#abschnitt")).toBe("docs/ci-richtlinie.md");
    expect(repositoryPath("npx tsx scripts/playbooks/pruefen.ts")).toBeNull();
    expect(repositoryPath("profile/liferay-625.md")).toBeNull();
    expect(repositoryPath("FORTSCHRITT.md")).toBeNull();
  });

  it("Modellkennungen werden gemeldet, erlaubte Schreibweisen nicht", () => {
    const family = ["Son", "net"].join("");
    const id = ["claude", "x-1"].join("-");
    const allowed = "Claude Code, Claude-Code-Sitzung, `.claude/`, Branch `claude/g4-a`, Stufe S1.";
    expect(checkDocument("playbooks/00-steuerung.md", allowed, context)).toEqual([]);
    expect(reasons(checkDocument("profile/liferay-gemeinsam.md", `${family} hilft. Kennung ${id}.`, context))).toEqual([
      `modellkennung ${id.slice(0, 8)}`,
      `modellkennung ${family}`,
    ]);
  });
});

describe("kindOf", () => {
  it("erkennt die Dateiarten nach den gemeinsamen Konventionen", () => {
    expect(kindOf("playbooks/vorlage-arbeitspaket.md")).toEqual({ kind: "vorlage" });
    expect(kindOf("profile/liferay-72.md")).toEqual({ kind: "profil" });
    expect(kindOf("playbooks/typescript/P07-pdf.md")).toEqual({ kind: "playbook", series: "P", number: 7 });
    expect(kindOf("playbooks/upgrade-625-auf-72/U06-abnahme.md")).toEqual({ kind: "playbook", series: "U", number: 6 });
    expect(kindOf("playbooks/00-steuerung.md")).toEqual({ kind: "sonstige" });
    expect(kindOf("profile/liferay-gemeinsam.md")).toEqual({ kind: "sonstige" });
  });
});
