/**
 * Bundesländer für die Feiertage (AK-209, AK-1205). Die Kürzel entsprechen denen von feiertagejs.
 */
export const FEDERAL_STATES = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
} as const;

export type FederalState = keyof typeof FEDERAL_STATES;

export function isFederalState(value: unknown): value is FederalState {
  return typeof value === "string" && Object.hasOwn(FEDERAL_STATES, value);
}

/** Anzeigename; unbekannte Kürzel werden unverändert angezeigt. */
export function federalStateName(code: string): string {
  return isFederalState(code) ? FEDERAL_STATES[code] : code;
}

/** Ein Kürzel, das kein Bundesland ist (AK-1205). */
export class UnknownFederalStateError extends Error {
  constructor(readonly code: string) {
    super(`Unbekanntes Bundesland: ${code}`);
    this.name = "UnknownFederalStateError";
  }
}
