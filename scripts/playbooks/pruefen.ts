/**
 * Playbook-Prüfung (KE-AK-01): `npx tsx scripts/playbooks/pruefen.ts [--blindtest] [datei …]`.
 *
 * Ohne Argument prüft sie alle Dateien unter `playbooks/` und `profile/`; mit Argument prüft sie jede genannte Datei
 * als Auftrag gegen die Pflichtfelder (KE-R01), die Vorlage `playbooks/vorlage-arbeitspaket.md` als Vorlage.
 *
 * `--blindtest`: für Branches ohne `src/`, `prisma/`, `e2e/` und `tests/` (`playbooks/00-steuerung.md`, Abschnitt 12).
 * Pfade in diesen Ordnern gelten als anzulegend und ergeben kein `fehlender-pfad`; alle anderen Prüfungen bleiben
 * aktiv. Gewählt ist ein Schalter statt einer Umgebungsvariable: Er steht im Aufruf und wirkt nie unbemerkt.
 * `--help` zeigt diesen Hinweis.
 *
 * Ausgabe je Befund `datei:zeile grund detail`; Rückgabe 0 ohne, 1 mit Befund.
 */
import { readFileSync } from "node:fs";
import { checkFiles } from "./dateien";
import { formatFinding } from "./pruefung";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  const header = /^\/\*\*\n([\s\S]*?)\n \*\//.exec(readFileSync(process.argv[1], "utf8"))?.[1] ?? "";
  console.log(header.replace(/^ \* ?/gm, ""));
  process.exit(0);
}
const blindtest = args.includes("--blindtest");
const files = args.filter((arg) => arg !== "--blindtest");
const findings = checkFiles(process.cwd(), files, blindtest);
for (const finding of findings) {
  console.log(formatFinding(finding));
}
console.log(
  findings.length === 0 ? "Playbook-Prüfung: keine Befunde." : `Playbook-Prüfung: ${findings.length} Befunde.`,
);
process.exit(findings.length === 0 ? 0 : 1);
