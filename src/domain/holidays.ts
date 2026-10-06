/**
 * Gesetzliche Feiertage je Bundesland (AK-404), berechnet mit feiertagejs – ohne Internetzugriff.
 * Reine Funktionen; Daten sind UTC-Mitternacht und stehen für Kalendertage.
 */
import { getHolidays } from "feiertagejs";
import { isFederalState } from "./federal-states";
import { toDateInput } from "./weeks";

const cache = new Map<string, ReadonlySet<string>>();

/** Gesetzliche Feiertage eines Jahres im Bundesland als Menge von JJJJ-MM-TT. */
export function publicHolidays(year: number, federalState: string): ReadonlySet<string> {
  if (!isFederalState(federalState)) {
    throw new Error(`Unbekanntes Bundesland: ${federalState}`);
  }
  const key = `${federalState}:${year}`;
  let holidays = cache.get(key);
  if (!holidays) {
    holidays = new Set(getHolidays(year, federalState).map((holiday) => holiday.dateString));
    cache.set(key, holidays);
  }
  return holidays;
}

/** Ist der Kalendertag im Bundesland ein gesetzlicher Feiertag? */
export function isPublicHoliday(date: Date, federalState: string): boolean {
  return publicHolidays(date.getUTCFullYear(), federalState).has(toDateInput(date));
}
