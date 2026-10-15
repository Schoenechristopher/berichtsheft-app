/**
 * Abgleich der Code-Landkarte (`specs/code-landkarte.md`) mit dem Quellcode (`docs/06-spec-architektur.md`,
 * „Code-Landkarte“): Welche Dateien unter `src/domain/`, `src/lib/`, `src/app/` und `src/components/` sind beschrieben, welche noch nicht?
 * Reine Funktionen, ohne Dateizugriff.
 */

/** Pfade, deren Dateien die Landkarte beschreiben muss. */
export const MAPPED_DIRS = ["src/domain/", "src/lib/", "src/app/", "src/components/"];

/** Quelldatei, die in die Landkarte gehört (keine Tests). */
export function isMappedSource(/** @type {string} */ file) {
  return MAPPED_DIRS.some((dir) => file.startsWith(dir)) && /\.tsx?$/.test(file) && !/\.(test|spec)\.tsx?$/.test(file);
}

/**
 * Dateien, die die Landkarte beschreibt: Pfade in Backticks in der ersten Spalte einer Tabellenzeile, z. B.
 * `` | `src/domain/weeks.ts` → `isoWeekOf()` | … ``. Erwähnungen im Fließtext (Einstieg, Fallen) zählen nicht.
 * @param {string} markdown
 * @returns {Set<string>}
 */
export function mappedFiles(markdown) {
  const files = new Set();
  for (const line of markdown.split("\n")) {
    const firstCell = /^\|([^|]*)\|/.exec(line)?.[1] ?? "";
    for (const match of firstCell.matchAll(/`(src\/[^`\s]+?\.tsx?)\b/g)) {
      files.add(match[1]);
    }
  }
  return files;
}

/**
 * @param {string[]} files Dateien im Repository
 * @param {string} markdown Inhalt der Landkarte
 * @returns {{ covered: string[], missing: string[], unknown: string[] }} beschrieben, noch nicht beschrieben,
 *   in der Landkarte genannt, aber nicht vorhanden
 */
export function compareMap(files, markdown) {
  const sources = files.filter(isMappedSource).sort();
  const mapped = mappedFiles(markdown);
  const existing = new Set(files);
  return {
    covered: sources.filter((file) => mapped.has(file)),
    missing: sources.filter((file) => !mapped.has(file)),
    unknown: [...mapped].filter((file) => !existing.has(file)).sort(),
  };
}

/** Abschnitt „Querschnitt“: Dateien, die keinem Fachmodul gehören. */
export const CROSS_SECTION = "Querschnitt";

/**
 * Abschnitte der Landkarte je Datei: `## M01 …` bis `## M09 …` ergeben das Modul (`M01` …), `## Querschnitt` ergibt
 * {@link CROSS_SECTION}. Tabellen unter anderen Überschriften zählen nicht. Eine Datei kann mehreren Modulen gehören
 * (z. B. `src/lib/reports.ts`).
 * @param {string} markdown
 * @returns {Map<string, Set<string>>}
 */
export function sectionsByFile(markdown) {
  /** @type {Map<string, Set<string>>} */
  const sections = new Map();
  let section = /** @type {string | null} */ (null);
  for (const line of markdown.split("\n")) {
    if (/^##\s/.test(line)) {
      section = /^##\s+(M\d{2})\s/.exec(line)?.[1] ?? (/^##\s+Querschnitt\b/.test(line) ? CROSS_SECTION : null);
      continue;
    }
    if (!section) {
      continue;
    }
    for (const file of mappedFiles(line)) {
      sections.set(file, (sections.get(file) ?? new Set()).add(section));
    }
  }
  return sections;
}
