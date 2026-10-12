import { describe, expect, it } from "vitest";
import { FEDERAL_STATES, federalStateName, isFederalState } from "./federal-states";

describe("Bundesländer", () => {
  it("AK-1205 AK-209 alle 16 Bundesländer sind wählbar, mit festen Kürzeln; unbekannte werden abgewiesen", () => {
    expect(Object.keys(FEDERAL_STATES)).toEqual([
      "BW",
      "BY",
      "BE",
      "BB",
      "HB",
      "HH",
      "HE",
      "MV",
      "NI",
      "NW",
      "RP",
      "SL",
      "SN",
      "ST",
      "SH",
      "TH",
    ]);
    expect(isFederalState("NW")).toBe(true);
    expect(isFederalState("NI")).toBe(true);
    expect(isFederalState("XX")).toBe(false);
    expect(isFederalState("toString")).toBe(false);
    expect(isFederalState("nw")).toBe(false);
    expect(isFederalState("AUGSBURG")).toBe(false);
    expect(isFederalState(undefined)).toBe(false);
    expect(federalStateName("NI")).toBe("Niedersachsen");
  });
});
