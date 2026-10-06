import { describe, expect, it } from "vitest";
import { FEDERAL_STATES, federalStateName, isFederalState } from "./federal-states";

describe("Bundesländer", () => {
  it("AK-209 alle 16 Bundesländer sind wählbar, mit den Kürzeln von feiertagejs", () => {
    expect(Object.keys(FEDERAL_STATES)).toHaveLength(16);
    expect(isFederalState("NW")).toBe(true);
    expect(isFederalState("NI")).toBe(true);
    expect(isFederalState("XX")).toBe(false);
    expect(isFederalState("toString")).toBe(false);
    expect(federalStateName("NI")).toBe("Niedersachsen");
  });
});
