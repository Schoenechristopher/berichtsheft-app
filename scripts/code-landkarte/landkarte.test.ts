import { describe, expect, it } from "vitest";
import { compareMap, isMappedSource, mappedFiles } from "./landkarte.mjs";

describe("Code-Landkarte (npm run landkarte)", () => {
  it("erfasst nur Quelldateien unter src/domain/, src/lib/, src/app/ und src/components/, keine Tests", () => {
    expect(isMappedSource("src/domain/clock.ts")).toBe(true);
    expect(isMappedSource("src/lib/people/service.ts")).toBe(true);
    expect(isMappedSource("src/domain/clock.test.ts")).toBe(false);
    expect(isMappedSource("src/app/layout.tsx")).toBe(true);
    expect(isMappedSource("src/app/(app)/berichte/[id]/actions.ts")).toBe(true);
    expect(isMappedSource("src/components/ui/status-chip.tsx")).toBe(true);
    expect(isMappedSource("src/components/ui/status-chip.test.tsx")).toBe(false);
    expect(isMappedSource("src/generated/prisma/client.ts")).toBe(false);
    expect(isMappedSource("src/app/globals.css")).toBe(false);
    expect(isMappedSource("src/lib/README.md")).toBe(false);
  });

  it("liest Pfade in Backticks, auch mit Funktion dahinter", () => {
    const markdown =
      "| `src/domain/weeks.ts` → `isoWeekOf()` | … |\n| `src/domain/clock.ts` | … |\nsrc/lib/db.ts ohne Backticks";
    expect([...mappedFiles(markdown)].sort()).toEqual(["src/domain/clock.ts", "src/domain/weeks.ts"]);
  });

  it("meldet erfasste, fehlende und unbekannte Dateien", () => {
    const files = ["src/domain/clock.ts", "src/domain/clock.test.ts", "src/lib/db.ts", "src/components/ui/neu.tsx"];
    expect(compareMap(files, "| `src/domain/clock.ts`, `src/domain/alt.ts` | … |")).toEqual({
      covered: ["src/domain/clock.ts"],
      missing: ["src/components/ui/neu.tsx", "src/lib/db.ts"],
      unknown: ["src/domain/alt.ts"],
    });
  });
});
