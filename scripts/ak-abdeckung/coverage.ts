/**
 * Nachweis der Testabdeckung: welche Akzeptanzkriterien (AK-IDs aus der Spezifikation) haben
 * einen Test, dessen Name die AK-ID nennt, oder einen neutralen Prüffall (`specs/pruefung/*.json`),
 * dessen ID mit der AK-ID beginnt. Reine Funktionen, ohne Dateizugriff.
 */
import ts from "typescript";

export type Level = "Unit" | "DB" | "Browser" | "Prüffall";

export interface Criterion {
  id: string;
  text: string;
  /** Ebene laut Spezifikation (nur UI-AK, z. B. „Browser + DB“). */
  level?: string;
}

export interface TestCase {
  file: string;
  name: string;
  /** Playwright-Tags, z. B. `@AK-1021` bei den Beispielszenarien (Name bleibt wörtlich). */
  tags?: string[];
  level: Level;
}

export interface ParsedTest {
  name: string;
  tags: string[];
}

export interface CoverageRow extends Criterion {
  tests: TestCase[];
}

/** AK-IDs der Spezifikation (AK-101 … AK-1102); „UI-AK-…“ gehört nicht dazu. */
const AK_ID = /(?<!UI-)AK-\d{3,4}/g;
/** UI-AK-IDs der UI-Spezifikation (UI-AK-01 … UI-AK-20). */
const UI_AK_ID = /UI-AK-\d{2}(?!\d)/g;

/** Liest alle Akzeptanzkriterien aus den Tabellen der Spezifikation (`| AK-101 | Text |`). */
export function parseCriteria(markdown: string): Criterion[] {
  const criteria: Criterion[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^\|\s*(AK-\d{3,4})\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (match && !criteria.some((criterion) => criterion.id === match[1])) {
      criteria.push({ id: match[1], text: match[2] });
    }
  }
  return criteria;
}

/**
 * Liest alle UI-Akzeptanzkriterien aus der Tabelle der UI-Spezifikation
 * (`| UI-AK-01 | Kriterium | Ebene |`).
 */
export function parseUiCriteria(markdown: string): Criterion[] {
  const criteria: Criterion[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^\|\s*(UI-AK-\d{2})\s*\|\s*(.+?)\s*\|\s*([^|]+?)\s*\|\s*$/.exec(line);
    if (match && !criteria.some((criterion) => criterion.id === match[1])) {
      criteria.push({ id: match[1], text: match[2], level: match[3] });
    }
  }
  return criteria;
}

/** Erster Satz des Kriteriums, ohne Ergänzungen und Präzisierungen. */
export function shortText(text: string, maxLength = 140): string {
  const firstSentence = /^(.+?[.!?])(\s|$)/.exec(text)?.[1] ?? text;
  return firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 1).trimEnd()}…` : firstSentence;
}

/** Ebene eines Tests nach Ablageort: Playwright unter `e2e/`, Datenbanktests unter `tests/db/`, sonst Unit. */
export function levelOf(file: string): Level {
  if (file.startsWith("e2e/")) {
    return "Browser";
  }
  if (file.startsWith("tests/db/")) {
    return "DB";
  }
  return "Unit";
}

const TEST_FUNCTIONS = new Set(["it", "test"]);
const MODIFIERS = new Set(["only", "skip", "fixme", "fail", "slow", "concurrent", "sequential", "each", "todo"]);

/** Ist `callee` ein Testaufruf wie `it(…)`, `test.skip(…)` oder `it.each(…)(…)`? */
function isTestCallee(callee: ts.Expression): boolean {
  if (ts.isIdentifier(callee)) {
    return TEST_FUNCTIONS.has(callee.text);
  }
  if (ts.isPropertyAccessExpression(callee)) {
    return MODIFIERS.has(callee.name.text) && isTestCallee(callee.expression);
  }
  if (ts.isCallExpression(callee)) {
    // it.each(cases)("Name", …)
    return isTestCallee(callee.expression);
  }
  return false;
}

function literalText(node: ts.Node | undefined): string | null {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text;
  }
  return null;
}

function isFunction(node: ts.Node | undefined): boolean {
  return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

/** Tags aus `{ tag: "@AK-101" }` bzw. `{ tag: ["@AK-101", "@AK-102"] }`. */
function tagsOf(node: ts.Node | undefined): string[] {
  if (!node || !ts.isObjectLiteralExpression(node)) {
    return [];
  }
  for (const property of node.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "tag") {
      const value = property.initializer;
      const items = ts.isArrayLiteralExpression(value) ? [...value.elements] : [value];
      return items.map(literalText).filter((text): text is string => text !== null);
    }
  }
  return [];
}

/**
 * Alle Tests einer Vitest- oder Playwright-Datei mit Namen und Tags (keine `describe`-Blöcke).
 * Formen: `test(name, fn)` und `test(name, { tag }, fn)`.
 */
export function parseTests(source: string, fileName: string): ParsedTest[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const tests: ParsedTest[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
      // `test.describe(…)` ist kein Test; `test.skip(bedingung, "Grund")` im Test auch nicht.
      const name = literalText(node.arguments[0]);
      const [, second, third] = node.arguments;
      if (name !== null && isFunction(second)) {
        tests.push({ name, tags: [] });
      } else if (name !== null && second && ts.isObjectLiteralExpression(second) && isFunction(third)) {
        tests.push({ name, tags: tagsOf(second) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return tests;
}

/** Nur die Testnamen. */
export function parseTestNames(source: string, fileName: string): string[] {
  return parseTests(source, fileName).map((test) => test.name);
}

function idsOf(test: TestCase): string[] {
  return [test.name, ...(test.tags ?? [])].flatMap((text) => [
    ...(text.match(AK_ID) ?? []),
    ...(text.match(UI_AK_ID) ?? []),
  ]);
}

function label(test: TestCase): string {
  return test.tags?.length ? `${test.name} (${test.tags.join(" ")})` : test.name;
}

/** Ordnet jedem Kriterium die Tests zu, deren Name die AK-ID enthält. */
export function buildCoverage(criteria: Criterion[], tests: TestCase[]): CoverageRow[] {
  return criteria.map((criterion) => ({
    ...criterion,
    tests: tests.filter((test) => idsOf(test).includes(criterion.id)),
  }));
}

/** AK- und UI-AK-IDs in Testnamen, die es in den Spezifikationen nicht gibt (Tippfehler). */
export function unknownIds(criteria: Criterion[], tests: TestCase[]): string[] {
  const known = new Set(criteria.map((criterion) => criterion.id));
  const ids = new Set(tests.flatMap(idsOf));
  return [...ids].filter((id) => !known.has(id)).sort();
}

const LEVEL_ORDER: Level[] = ["Unit", "DB", "Browser", "Prüffall"];

function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function testsCell(row: CoverageRow): string {
  return row.tests.length === 0
    ? "**kein Test**"
    : row.tests.map((test) => `\`${test.file}\`: ${escapeCell(label(test))}`).join("<br>");
}

function levelsCell(row: CoverageRow): string {
  return LEVEL_ORDER.filter((level) => row.tests.some((test) => test.level === level)).join(", ") || "–";
}

/** Kennzeichnung einer AK mit Ebene `Ablauf, G3` ohne Prüffall in `docs/03`. */
export const PENDING_LABEL = "Prüffall folgt (G3)";

/** Tabellen für `docs/03-testabdeckung.md`: AK-IDs, darunter ein eigener Abschnitt für die UI-AK-IDs. */
export function renderMarkdown(
  rows: CoverageRow[],
  uiRows: CoverageRow[] = [],
  pending: ReadonlySet<string> = new Set(),
): string {
  const covered = rows.filter((row) => row.tests.length > 0).length;
  const lines = [
    "# Testabdeckung der Akzeptanzkriterien",
    "",
    "Erzeugt mit `npm run ak:abdeckung` aus `docs/01-spezifikation.md`, `docs/05-ui-spezifikation.md`, den Testnamen (Vitest und Playwright) und den Prüffällen unter `specs/pruefung/`. Nicht von Hand bearbeiten; CI prüft, dass die Datei aktuell ist (`npm run ak:abdeckung -- --pruefen`).",
    "",
    "Ein Test zählt für ein Kriterium, wenn sein Name die AK-ID nennt; die Beispielszenarien tragen ihren Namen wörtlich wie in der Spezifikation und nennen die AK-IDs als Playwright-Tags (`@AK-…`). Ebenen: **Unit** = Vitest ohne Datenbank (`src/**/*.test.ts`, `scripts/**/*.test.ts`, `tests/pruefung/`), **DB** = Vitest gegen PostgreSQL (`tests/db/`), **Browser** = Playwright gegen die laufende Demo (`e2e/`; Projekte Chromium, Firefox, Edge und Smartphone 375 px, siehe `playwright.config.ts`), **Prüffall** = neutraler Prüffall aus `specs/pruefung/*.json`, dessen ID mit der AK-ID beginnt (ausgeführt vom Prüf-Runner `tests/pruefung/`).",
    "",
    `Abgedeckt: ${covered} von ${rows.length} Akzeptanzkriterien.`,
    "",
    `Spalte „${PENDING_LABEL}“: Die Fach-Spec führt die AK mit Ebene \`${DEFERRED_LEVEL}\` (nur im Ablauf prüfbar), und es gibt noch keinen Prüffall. Das ist in G2 kein Fehler; ab G3 braucht sie einen (Entscheidung E1).`,
    "",
    `| AK-ID | Kurztext | Tests | Ebene | ${PENDING_LABEL} |`,
    "| --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${escapeCell(shortText(row.text))} | ${testsCell(row)} | ${levelsCell(row)} | ${pending.has(row.id) ? "ja" : ""} |`,
    );
  }
  if (uiRows.length > 0) {
    const uiCovered = uiRows.filter((row) => row.tests.length > 0).length;
    lines.push(
      "",
      "## UI-Akzeptanzkriterien",
      "",
      "Aus `docs/05-ui-spezifikation.md` (UI-AK-01 … UI-AK-20). Ein Test zählt, wenn sein Name mit der UI-AK-ID beginnt bzw. sie nennt. „Ebene (Soll)“ ist die Ebene laut UI-Spezifikation.",
      "",
      `Abgedeckt: ${uiCovered} von ${uiRows.length} UI-Akzeptanzkriterien.`,
      "",
      `| UI-AK-ID | Kurztext | Tests | Ebene (Soll) | Ebene | ${PENDING_LABEL} |`,
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const row of uiRows) {
      lines.push(
        `| ${row.id} | ${escapeCell(shortText(row.text))} | ${testsCell(row)} | ${escapeCell(row.level ?? "–")} | ${levelsCell(row)} | ${pending.has(row.id) ? "ja" : ""} |`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

/** Module der Fach-Specs (`docs/06-spec-architektur.md`, „Modulschnitt“). */
export const MODULES = ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "Q"] as const;
/** Ebenen der Prüffälle (`specs/pruefung/format.md`). */
export const CASE_LEVELS = ["fachlogik", "ablauf", "daten", "upgrade"] as const;

/** Neutraler Prüffall, soweit die Abdeckung ihn braucht. */
export interface CheckCase {
  file: string;
  id: string;
  modul: string;
  ebene: string;
}

/** Prüffall-ID `<AK-ID>-<NN>`, z. B. `AK-1204-01` oder `UI-AK-14-01`. */
const CASE_ID = /^((?:UI-)?AK-\d{2,4})-(\d{2})$/;

/** Modul einer Fach-Spec aus ihrem Dateinamen, z. B. `M01-kalender-und-zeit.md` → `M01`. */
export function moduleOfSpecFile(fileName: string): string | null {
  return /^(M\d{2}|Q)-[^/]*\.md$/.exec(fileName)?.[1] ?? null;
}

/**
 * Ebenen der AK-Tabelle einer Fach-Spec (fünfte Spalte „Ebene“, `specs/vorlage-fach-spec.md`). `Ablauf, G3`
 * markiert eine AK, die sich nur im Ablauf (Browser) prüfen lässt; ihr Prüffall folgt in G3 (Entscheidung E1).
 */
export const SPEC_LEVELS = ["Fachlogik", "Daten", "Ablauf, G3"] as const;
/** Ebene „Ablauf, Prüffall folgt in G3“ (Entscheidung E1). */
export const DEFERRED_LEVEL = "Ablauf, G3";
/**
 * Schalter „ab G3 Pflicht“ (Entscheidung E1): In G2 ist eine AK mit Ebene `Ablauf, G3` ohne Prüffall kein Fehler.
 * Ab G3 auf `true` stellen; dann braucht auch sie einen Prüffall.
 */
export const DEFERRED_CASES_REQUIRED = false;

/** AK einer Fach-Spec mit ihrer Ebene (fehlt bei einer Tabelle mit vier Spalten). */
export interface ModuleCriterion {
  id: string;
  level?: string;
}

/**
 * Liest die Tabelle des Abschnitts „Akzeptanzkriterien“ einer Fach-Spec (`## 4. Akzeptanzkriterien`,
 * Zeilen `| AK-404 | Kurzfassung | Regeln | Prüffälle | Ebene |`). Eine Tabelle mit vier Spalten (ohne „Ebene“)
 * bleibt lesbar; eine Zeile mit anderer Spaltenzahl oder einem unbekannten Wert in „Ebene“ ist ein Fehler.
 */
export function parseModuleTable(markdown: string): { criteria: ModuleCriterion[]; errors: string[] } {
  const criteria: ModuleCriterion[] = [];
  const errors: string[] = [];
  let inSection = false;
  for (const line of markdown.split("\n")) {
    if (/^##\s/.test(line)) {
      inSection = /^##\s+(\d+\.\s+)?Akzeptanzkriterien\b/.test(line);
      continue;
    }
    const match = inSection ? /^\|\s*((?:UI-)?AK-\d{2,4})\s*\|/.exec(line) : null;
    if (!match || criteria.some((criterion) => criterion.id === match[1])) {
      continue;
    }
    // Zellen ohne die leeren Ränder vor dem ersten und nach dem letzten „|“; „\|“ trennt keine Zelle.
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/(?<!\\)\|$/, "")
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim());
    if (cells.length === 5) {
      const level = cells[4];
      if (!(SPEC_LEVELS as readonly string[]).includes(level)) {
        errors.push(`${match[1]}: unbekannte Ebene „${level}“ (erlaubt: ${SPEC_LEVELS.join("; ")}).`);
      }
      criteria.push({ id: match[1], level });
    } else if (cells.length === 4) {
      criteria.push({ id: match[1] });
    } else {
      errors.push(`${match[1]}: Zeile hat ${cells.length} statt 4 oder 5 Spalten.`);
      criteria.push({ id: match[1] });
    }
  }
  return { criteria, errors };
}

/** Nur die AK- und UI-AK-IDs der Tabelle „Akzeptanzkriterien“ einer Fach-Spec. */
export function parseModuleCriteria(markdown: string): string[] {
  return parseModuleTable(markdown).criteria.map((criterion) => criterion.id);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Liest die Prüffälle einer Datei und meldet Formfehler: Liste, Pflichtfelder je Ebene, gültige
 * Ebene und gültiges Modul, ID-Schema und `"id"` nur auf Prüffall-Ebene (wegen `prueffallIds()`).
 */
export function parseCheckCases(json: string, file: string): { cases: CheckCase[]; errors: string[] } {
  const errors: string[] = [];
  let content: unknown;
  try {
    content = JSON.parse(json);
  } catch (error) {
    return { cases: [], errors: [`${file}: kein gültiges JSON (${(error as Error).message})`] };
  }
  if (!Array.isArray(content)) {
    return { cases: [], errors: [`${file}: Prüffall-Datei muss eine Liste von Prüffällen sein.`] };
  }
  const cases: CheckCase[] = [];
  content.forEach((entry: unknown, index) => {
    const where = `${file}, Eintrag ${index + 1}`;
    if (!isObject(entry)) {
      errors.push(`${where}: kein Objekt.`);
      return;
    }
    const required = ["id", "modul", "ebene", "erwartet"];
    if (entry.ebene === "fachlogik") {
      required.push("schnittstelle", "eingabe");
    } else if (entry.ebene === "ablauf" || entry.ebene === "daten") {
      // Ein Daten-Fall legt seinen Ausgangsbestand zu „uhr“ an und braucht deshalb immer die Uhr.
      required.push("uhr", "schritte");
    }
    const missing = required.filter((name) => !(name in entry));
    if (missing.length > 0) {
      errors.push(`${where}: Pflichtfeld fehlt: ${missing.join(", ")}.`);
    }
    const id = typeof entry.id === "string" ? entry.id : "";
    const label = id ? `${file}: ${id}` : where;
    if (id && !CASE_ID.test(id)) {
      errors.push(`${label}: ID folgt nicht dem Schema <AK-ID>-<NN>.`);
    }
    if (typeof entry.modul !== "string" || !(MODULES as readonly string[]).includes(entry.modul)) {
      errors.push(`${label}: unbekanntes Modul „${String(entry.modul)}“.`);
    }
    if (typeof entry.ebene !== "string" || !(CASE_LEVELS as readonly string[]).includes(entry.ebene)) {
      errors.push(`${label}: unbekannte Ebene „${String(entry.ebene)}“.`);
    }
    if (id && typeof entry.modul === "string" && typeof entry.ebene === "string") {
      cases.push({ file, id, modul: entry.modul, ebene: entry.ebene });
    }
  });
  const idFields = [...json.matchAll(/"id"\s*:/g)].length;
  if (idFields !== content.length) {
    errors.push(
      `${file}: "id" darf nur auf der Ebene des Prüffalls stehen (${idFields}-mal bei ${content.length} Prüffällen).`,
    );
  }
  return { cases, errors };
}

/** AK-ID eines Prüffalls (ID ohne laufende Nummer). */
export function criterionOfCase(id: string): string | null {
  return CASE_ID.exec(id)?.[1] ?? null;
}

/**
 * Prüft die Prüffälle gegen Spezifikation und Fach-Specs: eindeutige IDs, bekannte AK-ID, AK gehört
 * zum `modul` des Prüffalls, jede AK gehört höchstens einem Modul, und jede AK eines beschriebenen
 * Moduls hat mindestens einen Prüffall. Ausnahme bis G3: AKs in `deferred` (Ebene `Ablauf, G3`), solange
 * `deferredRequired` (Vorgabe `DEFERRED_CASES_REQUIRED`) nicht gesetzt ist.
 */
export function checkCases(
  cases: CheckCase[],
  criteria: Criterion[],
  moduleCriteria: ReadonlyMap<string, readonly string[]>,
  deferred: ReadonlySet<string> = new Set(),
  deferredRequired: boolean = DEFERRED_CASES_REQUIRED,
): string[] {
  const errors: string[] = [];
  const known = new Set(criteria.map((criterion) => criterion.id));
  const owner = new Map<string, string>();
  for (const [module, ids] of moduleCriteria) {
    for (const id of ids) {
      if (!known.has(id)) {
        errors.push(`Fach-Spec ${module}: ${id} steht nicht in der Spezifikation.`);
      }
      const other = owner.get(id);
      if (other && other !== module) {
        errors.push(`${id} gehört zwei Modulen: ${other} und ${module}.`);
      }
      owner.set(id, other ?? module);
    }
  }
  const seen = new Set<string>();
  for (const entry of cases) {
    if (seen.has(entry.id)) {
      errors.push(`${entry.file}: Prüffall-ID ${entry.id} ist doppelt.`);
    }
    seen.add(entry.id);
    const criterion = criterionOfCase(entry.id);
    if (!criterion) {
      continue;
    }
    if (!known.has(criterion)) {
      errors.push(`${entry.file}: ${entry.id} nennt keine bekannte AK-ID.`);
    } else if (!moduleCriteria.get(entry.modul)?.includes(criterion)) {
      errors.push(`${entry.file}: ${entry.id} – ${criterion} gehört nicht zum Modul ${entry.modul}.`);
    }
  }
  const covered = new Set(cases.map((entry) => criterionOfCase(entry.id)));
  for (const [module, ids] of moduleCriteria) {
    for (const id of ids.filter((id) => !covered.has(id) && (deferredRequired || !deferred.has(id)))) {
      errors.push(`Modul ${module}: ${id} hat keinen Prüffall.`);
    }
  }
  return errors;
}

/** Prüffälle als Tests der Ebene „Prüffall“ (der Runner erzeugt ihre Testnamen, `parseTests` sieht sie nicht). */
export function casesAsTests(cases: CheckCase[]): TestCase[] {
  return cases.map((entry) => ({ file: entry.file, name: entry.id, level: "Prüffall" }));
}

/** AKs mit Ebene `Ablauf, G3` ohne Prüffall: Ihr Prüffall folgt in G3 (eigene Kennzeichnung im Bericht). */
export function pendingCriteria(deferred: ReadonlySet<string>, cases: CheckCase[]): string[] {
  const covered = new Set(cases.map((entry) => criterionOfCase(entry.id)));
  return [...deferred].filter((id) => !covered.has(id));
}
