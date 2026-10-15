/**
 * Playbook-Prüfung (KE-AK-01): `npx tsx scripts/playbooks/pruefen.ts [datei …]`.
 *
 * Ohne Argument prüft sie alle Dateien unter `playbooks/` und `profile/`; mit Argument prüft sie jede genannte Datei
 * als Auftrag gegen die Pflichtfelder (KE-R01), die Vorlage `playbooks/vorlage-arbeitspaket.md` als Vorlage.
 * Ausgabe je Befund `datei:zeile grund detail`; Rückgabe 0 ohne, 1 mit Befund.
 */
import { checkFiles } from "./dateien";
import { formatFinding } from "./pruefung";

const findings = checkFiles(process.cwd(), process.argv.slice(2));
for (const finding of findings) {
  console.log(formatFinding(finding));
}
console.log(
  findings.length === 0 ? "Playbook-Prüfung: keine Befunde." : `Playbook-Prüfung: ${findings.length} Befunde.`,
);
process.exit(findings.length === 0 ? 0 : 1);
