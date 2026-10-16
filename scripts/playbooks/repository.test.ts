import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkFiles, loadContext } from "./dateien";
import { checkDocument, formatFinding, VORLAGE_PATH } from "./pruefung";

const root = path.resolve(import.meta.dirname, "../..");

describe("Playbook-Prüfung im Repository", () => {
  it("KE-AK-01 Vorlage, Playbooks und Profile im Repository haben keine Befunde", () => {
    expect(checkFiles(root).map(formatFinding)).toEqual([]);
  });

  it("KE-AK-01 Blindtest: ohne src/, prisma/, e2e/, tests/ nur mit Schalter keine Pfadbefunde", () => {
    const copy = mkdtempSync(path.join(tmpdir(), "blindtest-"));
    try {
      for (const dir of ["specs", "playbooks", "profile", "docs", "scripts", ".github", ".claude", "docker"]) {
        if (existsSync(path.join(root, dir))) {
          cpSync(path.join(root, dir), path.join(copy, dir), { recursive: true });
        }
      }
      const reasonsOf = (blindtest: boolean) => checkFiles(copy, [], blindtest).map((finding) => finding.reason);
      expect(reasonsOf(true)).toEqual([]);
      const strict = reasonsOf(false);
      expect(strict.length).toBeGreaterThan(0);
      expect(new Set(strict)).toEqual(new Set(["fehlender-pfad"]));
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  });

  it("KE-AK-01 Vorlage besteht die Prüfung auch beim Aufruf mit Dateiname", () => {
    expect(checkFiles(root, [VORLAGE_PATH]).map(formatFinding)).toEqual([]);
  });

  it("KE-AK-01 ausgefülltes Beispiel der Vorlage ist ein vollständiger Auftrag", () => {
    const template = readFileSync(path.join(root, VORLAGE_PATH), "utf8");
    const example = /^```markdown\n([\s\S]*?)^```$/m.exec(template)?.[1];
    expect(example).toBeDefined();
    const findings = checkDocument("beispiel-auftrag.md", example ?? "", loadContext(root), true);
    expect(findings.map(formatFinding)).toEqual([]);
  });
});
