/**
 * `npm run ak:abdeckung`: meldet jede AK-ID der Spezifikation und jede UI-AK-ID der
 * UI-Spezifikation ohne Test und schreibt `docs/03-testabdeckung.md`. Mit `--pruefen` (CI) wird nichts geschrieben; das Skript scheitert,
 * wenn die Datei nicht aktuell ist. Ohne Test für eine AK-ID scheitert es immer.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCoverage,
  levelOf,
  parseCriteria,
  parseUiCriteria,
  parseTests,
  renderMarkdown,
  unknownIds,
  type TestCase,
} from "./coverage";

const root = path.resolve(import.meta.dirname, "../..");
const SPEC = "docs/01-spezifikation.md";
const UI_SPEC = "docs/05-ui-spezifikation.md";
const OUTPUT = "docs/03-testabdeckung.md";
const TEST_DIRS = ["src", "tests", "e2e", "scripts"];
const TEST_FILE = /\.(test|spec)\.tsx?$/;

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

  const rows = buildCoverage(criteria, tests);
  const uiRows = buildCoverage(uiCriteria, tests);
  const missing = [...rows, ...uiRows].filter((row) => row.tests.length === 0).map((row) => row.id);
  const unknown = unknownIds([...criteria, ...uiCriteria], tests);
  const markdown = renderMarkdown(rows, uiRows);

  console.log(
    `${criteria.length} Akzeptanzkriterien und ${uiCriteria.length} UI-Akzeptanzkriterien, ${tests.length} Tests in ` +
      `${files.length} Dateien; ohne Test: ${missing.length === 0 ? "keine" : missing.join(", ")}.`,
  );
  let failed = missing.length > 0;
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
