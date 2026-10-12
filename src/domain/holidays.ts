/**
 * Gesetzliche Feiertage je Bundesland (AK-404, AK-1206), berechnet mit feiertagejs – ohne Internetzugriff.
 * Reine Funktionen; Daten sind UTC-Mitternacht und stehen für Kalendertage.
 *
 * Feiertag ist jeder landesweite gesetzliche Feiertag des Bundeslands. feiertagejs kennt keine
 * einmaligen landesweiten Feiertage; sie stehen in `ONE_TIME_HOLIDAYS`. Kommunale oder regionale
 * Feiertage (z. B. Augsburger Friedensfest, Fronleichnam nur in Teilen Sachsens und Thüringens)
 * zählen nicht.
 */
import { getHolidays } from "feiertagejs";
import { UnknownFederalStateError, isFederalState, type FederalState } from "./federal-states";
import { toDateInput } from "./weeks";

/**
 * Einmalige landesweite Feiertage, die feiertagejs nicht liefert (JJJJ-MM-TT).
 * Quellen stehen in `specs/M01-kalender-und-zeit.md` (Bestätigte Auslegungen).
 */
export const ONE_TIME_HOLIDAYS: Readonly<Partial<Record<FederalState, readonly string[]>>> = {
  // Berlin, Gesetz über die Sonn- und Feiertage: 75. und 80. Jahrestag der Befreiung vom
  // Nationalsozialismus, 75. Jahrestag des Volksaufstands vom 17. Juni 1953.
  BE: ["2020-05-08", "2025-05-08", "2028-06-17"],
};

/**
 * Tage, die feiertagejs liefert, die im Bundesland aber kein gesetzlicher Feiertag waren:
 * Den Reformationstag führten Bremen, Hamburg, Niedersachsen und Schleswig-Holstein erst 2018
 * dauerhaft ein (2017 galt er einmalig bundesweit); feiertagejs liefert ihn dort auch davor.
 */
function isNotAHoliday(federalState: FederalState, date: string): boolean {
  const year = Number(date.slice(0, 4));
  return ["HB", "HH", "NI", "SH"].includes(federalState) && date.endsWith("-10-31") && year < 2018 && year !== 2017;
}

const cache = new Map<string, ReadonlySet<string>>();

/** Gesetzliche Feiertage eines Jahres im Bundesland als Menge von JJJJ-MM-TT. */
export function publicHolidays(year: number, federalState: string): ReadonlySet<string> {
  if (!isFederalState(federalState)) {
    throw new UnknownFederalStateError(federalState);
  }
  const key = `${federalState}:${year}`;
  let holidays = cache.get(key);
  if (!holidays) {
    const prefix = `${String(year).padStart(4, "0")}-`;
    holidays = new Set(
      [
        ...getHolidays(year, federalState).map((holiday) => holiday.dateString),
        ...(ONE_TIME_HOLIDAYS[federalState] ?? []).filter((date) => date.startsWith(prefix)),
      ]
        .filter((date) => !isNotAHoliday(federalState, date))
        .sort(),
    );
    cache.set(key, holidays);
  }
  return holidays;
}

/** Ist der Kalendertag im Bundesland ein gesetzlicher Feiertag? */
export function isPublicHoliday(date: Date, federalState: string): boolean {
  return publicHolidays(date.getUTCFullYear(), federalState).has(toDateInput(date));
}
