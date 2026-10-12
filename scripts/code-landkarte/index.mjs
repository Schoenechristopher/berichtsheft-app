/**
 * `npm run landkarte`: meldet, welche Dateien unter `src/domain/` und `src/lib/` die Code-Landkarte
 * (`specs/code-landkarte.md`) beschreibt und welche noch nicht.
 *
 * In G1 nur ein Bericht (Ausgang 0), weil erst M01 beschrieben ist. Mit `--pruefen` scheitert das Skript, wenn
 * eine Datei fehlt oder die Landkarte eine Datei nennt, die es nicht gibt; Pflicht in der CI ab Ende G2.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { compareMap } from "./landkarte.mjs";

const MAP = "specs/code-landkarte.md";
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const { covered, missing, unknown } = compareMap(files, readFileSync(MAP, "utf8"));

console.log(`Code-Landkarte (${MAP}): ${covered.length} Dateien erfasst, ${missing.length} noch nicht beschrieben.`);
console.log(`\nErfasst:\n${covered.map((file) => `  ${file}`).join("\n") || "  keine"}`);
console.log(`\nNoch nicht beschrieben:\n${missing.map((file) => `  ${file}`).join("\n") || "  keine"}`);
if (unknown.length > 0) {
  console.log(`\nIn der Landkarte genannt, aber nicht vorhanden:\n${unknown.map((file) => `  ${file}`).join("\n")}`);
}
if (process.argv.includes("--pruefen") && (missing.length > 0 || unknown.length > 0)) {
  console.error("\nDie Code-Landkarte ist nicht vollständig.");
  process.exitCode = 1;
}
