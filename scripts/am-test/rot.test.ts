import { describe, expect, it } from "vitest";

// Wegwerf-Test für den Nachweis von AM-AK-12 (Etappe A, A3): absichtlich rot, gelangt nie nach `main`.
describe("Test-PR A3", () => {
  it("scheitert absichtlich", () => {
    expect(1 + 1).toBe(3);
  });
});
