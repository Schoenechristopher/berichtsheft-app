/**
 * `npm run ak:abdeckung`: meldet jede AK-ID der Spezifikation und jede UI-AK-ID der
 * UI-Spezifikation ohne Test und schreibt `docs/03-testabdeckung.md`. Prüffälle aus
 * `specs/pruefung/*.json` zählen als Tests der Ebene „Prüffall“; Formfehler, unbekannte AK-IDs,
 * falsche Module und AKs beschriebener Module (`specs/Mxx-*.md`) ohne Prüffall lassen es scheitern. Mit `--pruefen` (CI) wird nichts geschrieben; das Skript scheitert,
 * wenn die Datei nicht aktuell ist. Ohne Test für eine AK-ID scheitert es immer.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCoverage,
  casesAsTests,
  checkCases,
  levelOf,
  moduleOfSpecFile,
  parseCheckCases,
  parseModuleCriteria,
  parseCriteria,
  parseUiCriteria,
  parseTests,
  renderMarkdown,
  unknownIds,
  type CheckCase,
  type TestCase,
} from "./coverage";

const root = path.resolve(import.meta.dirname, "../..");
const SPEC = "docs/01-spezifikation.md";
const UI_SPEC = "docs/05-ui-spezifikation.md";
const OUTPUT = "docs/03-testabdeckung.md";
const TEST_DIRS = ["src", "tests", "e2e", "scripts"];
const TEST_FILE = /\.(test|spec)\.tsx?$/;
const SPECS = "specs";
const CASES = "specs/pruefung";
/** Keine Prüffall-Datei (`specs/pruefung/format.md`). */
const NOT_CASES = new Set(["testdaten.json"]);

async function listDir(dir: string): Promise<string[]> {
  return readdir(path.join(root, dir)).catch(() => []);
}

/** Prüffälle aller Dateien unter `specs/pruefung/` mit ihren Formfehlern. */
async function readCheckCases(): Promise<{ cases: CheckCase[]; errors: string[] }> {
  const files = (await listDir(CASES)).filter((file) => file.endsWith(".json") && !NOT_CASES.has(file)).sort();
  const cases: CheckCase[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const parsed = parseCheckCases(await readFile(path.join(root, CASES, file), "utf8"), `${CASES}/${file}`);
    cases.push(...parsed.cases);
    errors.push(...parsed.errors);
  }
  return { cases, errors };
}

/** AK-IDs je beschriebenem Modul aus `specs/Mxx-*.md` und `specs/Q-*.md`. */
async function readModuleCriteria(): Promise<Map<string, string[]>> {
  const modules = new Map<string, string[]>();
  for (const file of (await listDir(SPECS)).sort()) {
    const moduleId = moduleOfSpecFile(file);
    if (moduleId) {
      modules.set(moduleId, parseModuleCriteria(await readFile(path.join(root, SPECS, file), "utf8")));
    }
  }
  return modules;
}

async function listTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && TEST_FILE.test(entry.name))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .filter((file) => !file.startsWith("src/generated/"))
    .sort();
}

async function main() {
  const check = process.argv.includes("--pruefen");
  const criteria = parseCriteria(await readFile(path.join(root, SPEC), "utf8"));
  const uiCriteria = parseUiCriteria(await readFile(path.join(root, UI_SPEC), "utf8"));
  const files = (await Promise.all(TEST_DIRS.map(listTestFiles))).flat();
  const tests: TestCase[] = [];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const { name, tags } of parseTests(source, file)) {
      tests.push({ file, name, tags, level: levelOf(file) });
    }
  }

  const testCount = tests.length;
  const caseFiles = await readCheckCases();
  const moduleCriteria = await readModuleCriteria();
  tests.push(...casesAsTests(caseFiles.cases));
  const caseErrors = [
    ...caseFiles.errors,
    ...checkCases(caseFiles.cases, [...criteria, ...uiCriteria], moduleCriteria),
  ];

  const rows = buildCoverage(criteria, tests);
  const uiRows = buildCoverage(uiCriteria, tests);
  const missing = [...rows, ...uiRows].filter((row) => row.tests.length === 0).map((row) => row.id);
  const unknown = unknownIds([...criteria, ...uiCriteria], tests);
  const markdown = renderMarkdown(rows, uiRows);

  console.log(
    `${criteria.length} Akzeptanzkriterien und ${uiCriteria.length} UI-Akzeptanzkriterien, ${testCount} Tests in ` +
      `${files.length} Dateien, ${caseFiles.cases.length} Prüffälle; beschriebene Module: ${[...moduleCriteria.keys()].join(", ") || "keine"}; ` +
      `ohne Test: ${missing.length === 0 ? "keine" : missing.join(", ")}.`,
  );
  let failed = missing.length > 0;
  if (caseErrors.length > 0) {
    console.error(`Fehler in den Prüffällen:\n- ${caseErrors.join("\n- ")}`);
    failed = true;
  }
  if (unknown.length > 0) {
    console.error(`AK-/UI-AK-IDs in Testnamen, die es in den Spezifikationen nicht gibt: ${unknown.join(", ")}`);
    failed = true;
  }

  const current = await readFile(path.join(root, OUTPUT), "utf8").catch(() => "");
  if (check) {
    if (current !== markdown) {
      console.error(`${OUTPUT} ist nicht aktuell – bitte \`npm run ak:abdeckung\` ausführen und committen.`);
      failed = true;
    }
  } else if (current !== markdown) {
    await writeFile(path.join(root, OUTPUT), markdown);
    console.log(`${OUTPUT} aktualisiert.`);
  }
  if (missing.length > 0) {
    console.error(`AK- bzw. UI-AK-IDs ohne Test: ${missing.join(", ")}`);
  }
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
