import { describe, expect, it } from "vitest";
import { TESTGRENZEN, testLimit } from "../../e2e/pruefung/testgrenzen";
import { loadCases } from "./cases";

const BROWSERS = ["chromium", "firefox", "msedge", "smartphone-375"];

describe("Testgrenzen des Ablauf-Runners (e2e/pruefung/testgrenzen.ts)", () => {
  it("jede Testgrenze nennt einen vorhandenen Ablauf-Fall, ein Browser-Projekt, Grund und Freigabe", () => {
    const flowIds = new Set(
      loadCases()
        .filter(({ entry }) => entry.ebene === "ablauf")
        .map(({ entry }) => entry.id),
    );
    for (const limit of TESTGRENZEN) {
      expect(flowIds.has(limit.id), `${limit.id} ist kein Ablauf-Fall`).toBe(true);
      expect(BROWSERS).toContain(limit.browser);
      expect(limit.grund.trim()).not.toBe("");
      expect(limit.freigabe.trim()).not.toBe("");
    }
  });

  it("gilt nur für genau die genannte ID und den genannten Browser", () => {
    expect(testLimit("AK-408-03", "firefox")).toBeDefined();
    expect(testLimit("AK-408-03", "chromium")).toBeUndefined();
    expect(testLimit("AK-408-04", "firefox")).toBeUndefined();
  });
});
