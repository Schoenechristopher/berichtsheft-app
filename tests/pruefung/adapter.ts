/**
 * TypeScript-Adapter für die neutralen Prüffälle (`specs/pruefung/format.md`): bildet die neutralen
 * Schnittstellen auf die Funktionen der App ab und wandelt Ein- und Ausgabeformate um. Er deutet kein
 * Ergebnis um; fachliche Fehler werden über ihre Fehlerart auf die festen Fehlercodes abgebildet.
 */
import { InvalidInstantError, clockFromEnvironment, now } from "@/domain/clock";
import { FEDERAL_STATES, UnknownFederalStateError, isFederalState } from "@/domain/federal-states";
import { isPublicHoliday, publicHolidays } from "@/domain/holidays";
import {
  APP_TIME_ZONE,
  InvalidIsoWeekError,
  compareWeeks,
  currentIsoWeek,
  isoWeekMonday,
  isoWeekOf,
  isoWeekWorkdays,
  nextIsoWeek,
  toDateInput,
  today,
  weekdayShort,
  type IsoWeek,
} from "@/domain/weeks";

export type Input = Record<string, unknown>;
export type Result = Record<string, unknown>;

/** Fehler im Prüffall selbst (Format, fehlendes Feld): lässt den Fall scheitern, ist nie ein Fehlercode. */
export class CaseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaseFormatError";
  }
}

/** Feste Fehlercodes aus `format.md` je Fehlerart der App. */
const ERROR_CODES: [new (...args: never[]) => Error, string][] = [
  [InvalidIsoWeekError, "woche_ungueltig"],
  [UnknownFederalStateError, "bundesland_unbekannt"],
  [InvalidInstantError, "zeitpunkt_ungueltig"],
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?[+-]\d{2}:\d{2}$/;
const WEEK = /^(\d{4})-W(\d{2})$/;

function field(input: Input, name: string): unknown {
  if (!(name in input)) {
    throw new CaseFormatError(`Eingabe „${name}“ fehlt.`);
  }
  return input[name];
}

function text(input: Input, name: string): string {
  const value = field(input, name);
  if (typeof value !== "string") {
    throw new CaseFormatError(`Eingabe „${name}“ muss Text sein.`);
  }
  return value;
}

function integer(input: Input, name: string): number {
  const value = field(input, name);
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new CaseFormatError(`Eingabe „${name}“ muss eine ganze Zahl sein.`);
  }
  return value;
}

/** `JJJJ-MM-TT` → UTC-Mitternacht (Kalendertag der App). */
export function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (!DATE.test(value) || Number.isNaN(date.getTime()) || toDateInput(date) !== value) {
    throw new CaseFormatError(`Kein Kalendertag im Format JJJJ-MM-TT: ${value}`);
  }
  return date;
}

/** Zeitpunkt nach ISO 8601 mit Offset. */
export function parseInstant(value: string): Date {
  const instant = new Date(value);
  if (!INSTANT.test(value) || Number.isNaN(instant.getTime())) {
    throw new CaseFormatError(`Kein Zeitpunkt nach ISO 8601 mit Offset: ${value}`);
  }
  return instant;
}

/** `JJJJ-Www` → Jahr und Woche; ob es die Woche gibt, entscheidet die App. */
export function parseWeek(value: string): IsoWeek {
  const match = WEEK.exec(value);
  if (!match) {
    throw new CaseFormatError(`Keine Woche im Format JJJJ-Www: ${value}`);
  }
  return { isoYear: Number(match[1]), isoWeek: Number(match[2]) };
}

export function formatWeek(week: IsoWeek): string {
  return `${week.isoYear}-W${String(week.isoWeek).padStart(2, "0")}`;
}

/** Zeitpunkt in Berliner Ortszeit mit Offset, z. B. `2026-10-12T09:00:00+02:00`. */
export function formatInstant(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const local = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
  const offsetMinutes = Math.round((Date.parse(`${local}Z`) - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const operations: Record<string, (input: Input) => Result> = {
  jetzt: () => ({ zeitpunkt: formatInstant(now()) }),
  uhrVorgeben: (input) => {
    const instant = text(input, "zeitpunkt");
    const mode = text(input, "betrieb");
    if (mode !== "test" && mode !== "produktiv") {
      throw new CaseFormatError(`Betrieb muss „test“ oder „produktiv“ sein: ${mode}`);
    }
    const clock = clockFromEnvironment({
      APP_FIXED_NOW: instant,
      NODE_ENV: mode === "produktiv" ? "production" : "test",
    });
    // Die Vorgabe wirkt, wenn die Uhr genau den vorgegebenen Zeitpunkt liefert.
    return { gestellt: clock.now().getTime() === new Date(instant).getTime() };
  },
  kalendertag: (input) => {
    const day = today(parseInstant(text(input, "zeitpunkt")));
    return { datum: toDateInput(day), wochentag: weekdayShort(day) };
  },
  isoWoche: (input) => ({ woche: formatWeek(isoWeekOf(parseDate(text(input, "datum")))) }),
  montagDerWoche: (input) => ({
    datum: toDateInput(isoWeekMonday(integer(input, "jahr"), integer(input, "woche"))),
  }),
  arbeitstage: (input) => ({
    tage: isoWeekWorkdays(integer(input, "jahr"), integer(input, "woche")).map(toDateInput),
  }),
  naechsteWoche: (input) => ({ woche: formatWeek(nextIsoWeek(parseWeek(text(input, "woche")))) }),
  vergleicheWochen: (input) => {
    const order = compareWeeks(parseWeek(text(input, "a")), parseWeek(text(input, "b")));
    return { ergebnis: order < 0 ? "frueher" : order > 0 ? "spaeter" : "gleich" };
  },
  aktuelleWoche: (input) => ({ woche: formatWeek(currentIsoWeek(parseInstant(text(input, "zeitpunkt")))) }),
  bundeslaender: () => ({ bundeslaender: Object.keys(FEDERAL_STATES) }),
  istBundesland: (input) => ({ bundesland: isFederalState(text(input, "kuerzel")) }),
  istFeiertag: (input) => ({
    feiertag: isPublicHoliday(parseDate(text(input, "datum")), text(input, "bundesland")),
  }),
  feiertage: (input) => ({
    feiertage: [...publicHolidays(integer(input, "jahr"), text(input, "bundesland"))].sort(),
  }),
};

/** Namen aller Schnittstellen, die der Adapter kennt. */
export const INTERFACES = Object.keys(operations);

/**
 * Ruft eine neutrale Schnittstelle auf. Ein fachlicher Fehler der App wird zu `{ fehler: <code> }`;
 * eine unbekannte Schnittstelle, ein fehlerhafter Prüffall und jeder andere Fehler werfen.
 */
export function call(interfaceName: string, input: Input): Result {
  const operation = Object.hasOwn(operations, interfaceName) ? operations[interfaceName] : undefined;
  if (!operation) {
    throw new CaseFormatError(`Unbekannte Schnittstelle: ${interfaceName}`);
  }
  try {
    return operation(input);
  } catch (error) {
    const code = ERROR_CODES.find(([type]) => error instanceof type)?.[1];
    if (code) {
      return { fehler: code };
    }
    throw error;
  }
}
