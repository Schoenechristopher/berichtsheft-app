/**
 * Nachweis der Testabdeckung: welche Akzeptanzkriterien (AK-IDs aus der Spezifikation) haben
 * einen Test, dessen Name die AK-ID nennt. Reine Funktionen, ohne Dateizugriff.
 */
import ts from "typescript";

export type Level = "Unit" | "DB" | "Browser";

export interface Criterion {
  id: string;
  text: string;
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

const AK_ID = /AK-\d{3,4}/g;

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
  return [test.name, ...(test.tags ?? [])].flatMap((text) => text.match(AK_ID) ?? []);
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

/** AK-IDs in Testnamen, die es in der Spezifikation nicht gibt (Tippfehler). */
export function unknownIds(criteria: Criterion[], tests: TestCase[]): string[] {
  const known = new Set(criteria.map((criterion) => criterion.id));
  const ids = new Set(tests.flatMap(idsOf));
  return [...ids].filter((id) => !known.has(id)).sort();
}

const LEVEL_ORDER: Level[] = ["Unit", "DB", "Browser"];

function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** Tabelle für `docs/03-testabdeckung.md`. */
export function renderMarkdown(rows: CoverageRow[]): string {
  const covered = rows.filter((row) => row.tests.length > 0).length;
  const lines = [
    "# Testabdeckung der Akzeptanzkriterien",
    "",
    "Erzeugt mit `npm run ak:abdeckung` aus `docs/01-spezifikation.md` und den Testnamen (Vitest und Playwright). Nicht von Hand bearbeiten; CI prüft, dass die Datei aktuell ist (`npm run ak:abdeckung -- --pruefen`).",
    "",
    "Ein Test zählt für ein Kriterium, wenn sein Name die AK-ID nennt; die Beispielszenarien tragen ihren Namen wörtlich wie in der Spezifikation und nennen die AK-IDs als Playwright-Tags (`@AK-…`). Ebenen: **Unit** = Vitest ohne Datenbank (`src/**/*.test.ts`, `scripts/**/*.test.ts`), **DB** = Vitest gegen PostgreSQL (`tests/db/`), **Browser** = Playwright gegen die laufende Demo (`e2e/`; Projekte Chromium, Firefox, Edge und Smartphone 375 px, siehe `playwright.config.ts`).",
    "",
    `Abgedeckt: ${covered} von ${rows.length} Akzeptanzkriterien.`,
    "",
    "| AK-ID | Kurztext | Tests | Ebene |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    const tests =
      row.tests.length === 0
        ? "**kein Test**"
        : row.tests.map((test) => `\`${test.file}\`: ${escapeCell(label(test))}`).join("<br>");
    const levels = LEVEL_ORDER.filter((level) => row.tests.some((test) => test.level === level)).join(", ") || "–";
    lines.push(`| ${row.id} | ${escapeCell(shortText(row.text))} | ${tests} | ${levels} |`);
  }
  return `${lines.join("\n")}\n`;
}
