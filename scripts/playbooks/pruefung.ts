/**
 * Playbook-Prüfung (KE-AK-01, KE-S02): prüft Auftragsvorlage, Aufträge, Playbooks und Plattform-Profile auf
 * Pflichtabschnitte, AK- und Prüffall-IDs, Repository-Pfade und Modellkennungen (MW-R03). Reine Funktionen, ohne
 * Dateizugriff; das Einlesen übernimmt `dateien.ts`. Jeder Befund trägt einen festen Grund (`REASONS`), Tests prüfen
 * den Grund, nicht den Wortlaut.
 */

/** Feste, maschinenlesbare Gründe eines Befunds. */
export const REASONS = [
  "fehlender-abschnitt",
  "leerer-abschnitt",
  "falsche-reihenfolge",
  "fehlende-pruef-id",
  "fehlende-stufe",
  "fehlender-denkaufwand",
  "fehlender-betrag",
  "fehlende-harte-grenze",
  "fehlende-diagnose-grenze",
  "fehlende-ak-id",
  "fehlender-nachweis",
  "unbekannte-ak-id",
  "unbekannte-prueffall-id",
  "fehlender-pfad",
  "modellkennung",
] as const;

export type Reason = (typeof REASONS)[number];

export interface Finding {
  file: string;
  /** Zeile (ab 1); 0, wenn sich der Befund auf die ganze Datei bezieht. */
  line: number;
  reason: Reason;
  /** Betroffener Abschnitt, ID, Pfad oder Fundstelle. */
  detail: string;
}

/** Art einer Datei, die die Prüfung kennt. */
export type DocumentKind =
  | { kind: "vorlage" }
  | { kind: "auftrag" }
  | { kind: "playbook"; series: "P" | "U"; number: number }
  | { kind: "profil" }
  | { kind: "sonstige" };

/** Was die Prüfung aus dem Repository braucht. */
export interface Context {
  /** AK-IDs je Modul aus den AK-Tabellen der Fach-Specs, z. B. `M01` → `AK-404`, …; `Q` → `AK-1101`, …. */
  moduleCriteria: ReadonlyMap<string, readonly string[]>;
  /** Alle Prüffall-IDs aus `specs/pruefung/*.json`. */
  caseIds: ReadonlySet<string>;
  /** Ob es einen Repository-Pfad (Datei oder Ordner) gibt. */
  pathExists: (path: string) => boolean;
}

export const VORLAGE_PATH = "playbooks/vorlage-arbeitspaket.md";

/** Pflichtabschnitte eines Auftrags (KE-R01), geprüft wird der Anfang der Überschrift. */
export const ORDER_SECTIONS = [
  "Ziel und Fertig-Kriterium",
  "Playbook und Schritt",
  "Dateien in Lesereihenfolge",
  "Prüfbefehle",
  "Branch, Stufe und Denkaufwand",
  "Budget und Abbruch",
  "Bekannte Fallen",
  "Erwartete Rückmeldung",
] as const;

/** Die Vorlage hat zusätzlich den Block mit den gemeinsamen Regeln (KE-S02). */
export const TEMPLATE_SECTIONS = [...ORDER_SECTIONS, "Gemeinsame Regeln für alle Pakete"] as const;

/** Abschnitte eines Playbooks P00–P10 bzw. U00–U06, in dieser Reihenfolge. */
export const PLAYBOOK_SECTIONS = [
  "1. Ziel und Fertig-Kriterium",
  "2. Voraussetzungen",
  "3. Eingaben",
  "4. Weg A: aus dem Quellcode",
  "5. Weg B: aus der Spec",
  "6. Empfehlung",
  "7. Schritte",
  "8. Prüfung",
  "9. Abschluss",
  "10. Typische Fehler",
] as const;

/** Abschnitte eines Plattform-Profils, in dieser Reihenfolge, dazu der Nachweis-Abschnitt. */
export const PROFILE_SECTIONS = [
  "1. Laufzeit und Versionen",
  "2. Projektstruktur und Build",
  "3. Abbildung der Bausteine",
  "4. Tests und Prüf-Adapter",
  "5. Lokaler Start, Cloud-Sitzung und CI",
  "6. Bewusste Abweichungen",
  "7. Fallstricke und Grenzen",
] as const;
export const PROOF_SECTION = "Nachweis AK-505 und AK-508";
export const PROOF_IDS = ["AK-505", "AK-508"] as const;

export const PROFILE_FILES = ["profile/typescript-nextjs.md", "profile/liferay-625.md", "profile/liferay-72.md"];

/** Ordner, die in G4 neu entstehen; Pfade darin werden nicht geprüft (gemeinsame Konventionen G4). */
const FUTURE_DIRS = ["playbooks/", "profile/"];

/** Anfänge von Repository-Pfaden, deren Existenz geprüft wird. */
const PATH_PREFIXES = [
  "src/",
  "prisma/",
  "specs/",
  "docs/",
  "scripts/",
  "e2e/",
  "tests/",
  "profile/",
  "playbooks/",
  ".github/",
  ".claude/",
  "docker/",
];

/** Bestimmt die Art einer Datei aus ihrem Repository-Pfad (mit `/`). */
export function kindOf(path: string): DocumentKind {
  if (path === VORLAGE_PATH) {
    return { kind: "vorlage" };
  }
  if (PROFILE_FILES.includes(path)) {
    return { kind: "profil" };
  }
  const platform = /^playbooks\/(?:typescript|liferay-625|liferay-72)\/P(\d{2})-[^/]+\.md$/.exec(path);
  if (platform) {
    return { kind: "playbook", series: "P", number: Number(platform[1]) };
  }
  const upgrade = /^playbooks\/upgrade-625-auf-72\/U(\d{2})-[^/]+\.md$/.exec(path);
  if (upgrade) {
    return { kind: "playbook", series: "U", number: Number(upgrade[1]) };
  }
  return { kind: "sonstige" };
}

interface Section {
  title: string;
  line: number;
  body: string;
}

/** Zeilen mit einer Markierung, ob sie in einem Codeblock (```) liegen. Die Zaunzeilen selbst zählen als Codeblock. */
function linesOf(markdown: string): { text: string; inFence: boolean }[] {
  let inFence = false;
  return markdown.split("\n").map((text) => {
    if (/^\s*```/.test(text)) {
      inFence = !inFence;
      return { text, inFence: true };
    }
    return { text, inFence };
  });
}

/** Abschnitte der Ebene `##` außerhalb von Codeblöcken; der Text reicht bis zur nächsten `##`-Überschrift. */
export function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  linesOf(markdown).forEach(({ text, inFence }, index) => {
    const heading = inFence ? null : /^##\s+(.+?)\s*$/.exec(text);
    if (heading) {
      sections.push({ title: heading[1], line: index + 1, body: "" });
    } else if (sections.length > 0) {
      sections[sections.length - 1].body += `${text}\n`;
    }
  });
  return sections;
}

function findSection(sections: Section[], title: string): Section | undefined {
  return sections.find((section) => section.title.startsWith(title));
}

/** Prüft, dass die Abschnitte vorhanden und nicht leer sind, auf Wunsch auch ihre Reihenfolge. */
function checkSections(file: string, sections: Section[], titles: readonly string[], ordered: boolean): Finding[] {
  const findings: Finding[] = [];
  let lastIndex = -1;
  for (const title of titles) {
    const index = sections.findIndex((section) => section.title.startsWith(title));
    if (index < 0) {
      findings.push({ file, line: 0, reason: "fehlender-abschnitt", detail: title });
      continue;
    }
    const section = sections[index];
    if (section.body.trim() === "") {
      findings.push({ file, line: section.line, reason: "leerer-abschnitt", detail: title });
    }
    if (ordered && index < lastIndex) {
      findings.push({ file, line: section.line, reason: "falsche-reihenfolge", detail: title });
    }
    lastIndex = Math.max(lastIndex, index);
  }
  return findings;
}

/**
 * Kandidat für eine AK-, UI-AK- oder Prüffall-ID; `KE-AK-01`, `AM-AK-13` o. Ä. zählen nicht (anderes Präfix). Ein
 * Kandidat, der keine gültige Form hat (z. B. `AK-12011`), ist eine unbekannte AK-ID.
 */
const SPEC_ID_CANDIDATE = /(?<![\w-])(?:UI-)?AK-\d+(?:-\d+)*(?![\w-]*\w)/g;
/** Gültige Form: AK-ID (`AK-404`, `UI-AK-01`), wahlweise mit laufender Nummer des Prüffalls (`AK-404-01`). */
const SPEC_ID = /^(UI-AK-\d{2}|AK-\d{3,4})(-\d{2})?$/;
/** Prüf-ID im Fertig-Kriterium: AK-, UI-AK-, Prüffall- oder Spec-AK-ID wie `KE-AK-01`. */
const ANY_CHECK_ID = /(?<![\w-])(?:[A-Z]{1,3}-)?AK-\d{2,4}(?:-\d{2})?\b/;

/** Inhaltliche Pflichtfelder eines Auftrags (KE-R01, KE-R14, MW-R05). */
function checkOrderContent(file: string, sections: Section[]): Finding[] {
  const findings: Finding[] = [];
  const goal = findSection(sections, "Ziel und Fertig-Kriterium");
  if (goal && goal.body.trim() !== "") {
    // „keine Prüffälle“ zählt nur mit Begründung dahinter, z. B. „keine Prüffälle, weil …“.
    const reasoned = /keine Prüffälle\s*[,:;–(-]\s*\S{2,}/i.test(goal.body);
    if (!ANY_CHECK_ID.test(goal.body) && !reasoned) {
      findings.push({ file, line: goal.line, reason: "fehlende-pruef-id", detail: goal.title });
    }
  }
  const level = findSection(sections, "Branch, Stufe und Denkaufwand");
  if (level && level.body.trim() !== "") {
    if (!/\bS[123]\b/.test(level.body)) {
      findings.push({ file, line: level.line, reason: "fehlende-stufe", detail: level.title });
    }
    const effortAfter = /Denkaufwand\W{0,3}(?:niedrig|mittel|hoch|sehr hoch|maximal)\b/i;
    // Gebeugt vor dem Wort: „niedriger“, „mittlerer“, „hoher“, „maximaler Denkaufwand“.
    const effortBefore = /\b(?:niedrig|mittler|hoh|maximal)\w*\s+Denkaufwand/i;
    if (!effortAfter.test(level.body) && !effortBefore.test(level.body)) {
      findings.push({ file, line: level.line, reason: "fehlender-denkaufwand", detail: level.title });
    }
  }
  const budget = findSection(sections, "Budget und Abbruch");
  if (budget && budget.body.trim() !== "") {
    if (!/\d\s*(US-Dollar|USD|\$)|(US-Dollar|USD|\$)\s*\d/.test(budget.body)) {
      findings.push({ file, line: budget.line, reason: "fehlender-betrag", detail: budget.title });
    }
    if (!/harte Grenze[^\d]{0,40}\d/i.test(budget.body)) {
      findings.push({ file, line: budget.line, reason: "fehlende-harte-grenze", detail: budget.title });
    }
    if (!/Diagnose[^\d]{0,40}\d/i.test(budget.body)) {
      findings.push({ file, line: budget.line, reason: "fehlende-diagnose-grenze", detail: budget.title });
    }
  }
  return findings;
}

/**
 * AK-IDs, die ein Playbook nennen muss: Pnn (n = 1…9) die von Mnn, P10 die von Q, sonst keine. Jede AK-ID muss einzeln
 * dastehen; ein Bereich „AK-1201 bis AK-1206“ zählt nur seine Endpunkte.
 */
function requiredCriteria(kind: DocumentKind, context: Context): readonly string[] {
  if (kind.kind !== "playbook" || kind.series !== "P") {
    return [];
  }
  if (kind.number >= 1 && kind.number <= 9) {
    return context.moduleCriteria.get(`M0${kind.number}`) ?? [];
  }
  return kind.number === 10 ? (context.moduleCriteria.get("Q") ?? []) : [];
}

/**
 * Modellkennungen (MW-R03): `claude-<familie>…` oder `claude-<version>-…` (z. B. `claude-3-5-…`) und die
 * Familiennamen als ganze Wörter. Erlaubt bleiben „Claude Code“, „Claude-Sitzung“, `.claude/`, `claude/…` und
 * Pfade wie `/tmp/claude-0/`.
 */
const MODEL_ID = /\bclaude-(?:opus|sonnet|haiku|fable|\d+[-.]\d)[\w.-]*/gi;
const MODEL_FAMILY = /\b(?:opus|sonnet|haiku|fable)\b/gi;

/** Prüfungen für jede Datei: IDs, Repository-Pfade und Modellkennungen. */
function checkReferences(file: string, markdown: string, context: Context): Finding[] {
  const findings: Finding[] = [];
  const knownCriteria = new Set([...context.moduleCriteria.values()].flat());
  linesOf(markdown).forEach(({ text }, index) => {
    const line = index + 1;
    for (const [id] of text.matchAll(SPEC_ID_CANDIDATE)) {
      const [, criterion, caseSuffix] = SPEC_ID.exec(id) ?? [];
      if (!criterion) {
        findings.push({ file, line, reason: "unbekannte-ak-id", detail: id });
      } else if (caseSuffix) {
        if (!context.caseIds.has(id)) {
          findings.push({ file, line, reason: "unbekannte-prueffall-id", detail: id });
        }
      } else if (!knownCriteria.has(criterion)) {
        findings.push({ file, line, reason: "unbekannte-ak-id", detail: id });
      }
    }
    if (!/^\s*```/.test(text)) {
      for (const match of text.matchAll(/`([^`\n]+)`/g)) {
        const path = repositoryPath(match[1]);
        if (path && !context.pathExists(path)) {
          findings.push({ file, line, reason: "fehlender-pfad", detail: path });
        }
      }
    }
    const ids = [...text.matchAll(MODEL_ID)];
    for (const match of ids) {
      findings.push({ file, line, reason: "modellkennung", detail: match[0] });
    }
    for (const match of text.matchAll(MODEL_FAMILY)) {
      // Ein Familienname innerhalb einer schon gemeldeten Kennung zählt nicht doppelt.
      const inId = ids.some((id) => match.index >= id.index && match.index < id.index + id[0].length);
      if (!inId) {
        findings.push({ file, line, reason: "modellkennung", detail: match[0] });
      }
    }
  });
  return findings;
}

/**
 * Zu prüfender Repository-Pfad aus dem Inhalt eines Backtick-Abschnitts, sonst `null`: nur ein einzelnes Wort mit
 * bekanntem Anfang; ausgenommen sind Muster (`*`, `{a,b}`, `<…>`, `…`) und die Ordner, die in G4 neu entstehen
 * (`playbooks/`, `profile/` samt Unterordnern). Eine Zeilenangabe (`:12`, `:12-20`) oder ein Anker (`#…`) am Ende
 * zählt nicht zum Pfad.
 */
export function repositoryPath(code: string): string | null {
  const text = code.trim();
  if (/\s/.test(text) || !PATH_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    return null;
  }
  if (/[*<>…{}]/.test(text) || FUTURE_DIRS.some((dir) => text.startsWith(dir))) {
    return null;
  }
  return text.replace(/#.*$/, "").replace(/:\d+(?:[-:]\d+)?$/, "");
}

/**
 * Prüft eine Datei. `asOrder` erzwingt die Prüfung als Auftrag (Aufruf mit Dateiname, KE-AK-01), außer für die
 * Vorlage selbst.
 */
export function checkDocument(file: string, markdown: string, context: Context, asOrder = false): Finding[] {
  const detected = kindOf(file);
  const kind: DocumentKind = asOrder && detected.kind !== "vorlage" ? { kind: "auftrag" } : detected;
  const sections = parseSections(markdown);
  const findings: Finding[] = [];
  switch (kind.kind) {
    case "vorlage":
      findings.push(...checkSections(file, sections, TEMPLATE_SECTIONS, false));
      break;
    case "auftrag":
      findings.push(...checkSections(file, sections, ORDER_SECTIONS, false));
      findings.push(...checkOrderContent(file, sections));
      break;
    case "playbook":
      findings.push(...checkSections(file, sections, PLAYBOOK_SECTIONS, true));
      for (const id of requiredCriteria(kind, context)) {
        if (!new RegExp(`(?<![\\w-])${id}(?!\\d)`).test(markdown)) {
          findings.push({ file, line: 0, reason: "fehlende-ak-id", detail: id });
        }
      }
      break;
    case "profil": {
      findings.push(...checkSections(file, sections, [...PROFILE_SECTIONS, PROOF_SECTION], true));
      const proof = findSection(sections, PROOF_SECTION);
      for (const id of proof ? PROOF_IDS : []) {
        if (!new RegExp(`(?<![\\w-])${id}(?!\\d)`).test(proof?.body ?? "")) {
          findings.push({ file, line: proof?.line ?? 0, reason: "fehlender-nachweis", detail: id });
        }
      }
      break;
    }
    case "sonstige":
      break;
  }
  findings.push(...checkReferences(file, markdown, context));
  return findings;
}

/** Eine Zeile je Befund: `datei:zeile grund detail`. */
export function formatFinding(finding: Finding): string {
  return `${finding.file}:${finding.line} ${finding.reason} ${finding.detail}`;
}
