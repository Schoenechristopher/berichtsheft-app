/**
 * Einlesen für die Playbook-Prüfung: AK-Tabellen der Fach-Specs, Prüffall-IDs und die Dateien unter `playbooks/` und
 * `profile/`. Die Prüfregeln selbst stehen in `pruefung.ts`.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { moduleOfSpecFile, parseCheckCases, parseModuleCriteria } from "../ak-abdeckung/coverage";
import { checkDocument, type Context, type Finding } from "./pruefung";

/** Keine Prüffall-Datei (`specs/pruefung/format.md`). */
const NOT_CASES = new Set(["testdaten.json"]);

/** Ordner, deren Markdown-Dateien ohne Argument geprüft werden. */
export const CHECKED_DIRS = ["playbooks", "profile"];

export function loadContext(root: string, blindtest = false): Context {
  const specsDir = path.join(root, "specs");
  const moduleCriteria = new Map<string, string[]>();
  for (const name of readdirSync(specsDir)) {
    const specModule = moduleOfSpecFile(name);
    if (specModule) {
      moduleCriteria.set(specModule, parseModuleCriteria(readFileSync(path.join(specsDir, name), "utf8")));
    }
  }
  const casesDir = path.join(specsDir, "pruefung");
  const caseIds = new Set<string>();
  for (const name of readdirSync(casesDir)) {
    if (name.endsWith(".json") && !NOT_CASES.has(name)) {
      const { cases } = parseCheckCases(readFileSync(path.join(casesDir, name), "utf8"), name);
      cases.forEach((checkCase) => caseIds.add(checkCase.id));
    }
  }
  return { moduleCriteria, caseIds, pathExists: (file) => existsSync(path.join(root, file)), blindtest };
}

/** Alle Markdown-Dateien unter `playbooks/` und `profile/` als Repository-Pfade mit `/`; fehlende Ordner sind leer. */
export function listDocuments(root: string): string[] {
  const files: string[] = [];
  for (const dir of CHECKED_DIRS) {
    if (!existsSync(path.join(root, dir))) {
      continue;
    }
    for (const entry of readdirSync(path.join(root, dir), { recursive: true, encoding: "utf8" })) {
      if (entry.endsWith(".md")) {
        files.push(`${dir}/${entry.split(path.sep).join("/")}`);
      }
    }
  }
  return files.sort();
}

/** Prüft die genannten Dateien als Aufträge oder, ohne Angabe, alle Dateien unter `playbooks/` und `profile/`. `blindtest` siehe `Context`. */
export function checkFiles(root: string, files: string[] = [], blindtest = false): Finding[] {
  const context = loadContext(root, blindtest);
  const asOrder = files.length > 0;
  const targets = asOrder
    ? files.map((file) => path.relative(root, path.resolve(root, file)).split(path.sep).join("/"))
    : listDocuments(root);
  return targets.flatMap((file) => checkDocument(file, readFileSync(path.join(root, file), "utf8"), context, asOrder));
}
