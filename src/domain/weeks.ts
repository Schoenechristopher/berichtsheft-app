/**
 * Kalender und Zeit (M01, AK-1202 – AK-1204): Kalenderwochen nach ISO 8601 (Montag bis Sonntag,
 * KW 1 enthält den 4. Januar) und Kalendertage in Europe/Berlin.
 * Reine Funktionen; Daten sind UTC-Mitternacht und stehen für Kalendertage.
 */

/** Zeitzone der Firma: bestimmt den Kalendertag und damit, wann eine neue Woche beginnt (AK-1202). */
export const APP_TIME_ZONE = "Europe/Berlin";

/** Eine Woche, die es nicht gibt, z. B. KW 53/2027 oder KW 0 (AK-1204). */
export class InvalidIsoWeekError extends Error {
  constructor(
    readonly isoYear: number,
    readonly isoWeek: number,
  ) {
    super(
      Number.isInteger(isoYear) && Number.isInteger(isoWeek)
        ? `Ungültige Kalenderwoche: KW ${isoWeek}/${isoYear} (das Jahr ${isoYear} hat ${isoWeeksInYear(isoYear)} Kalenderwochen).`
        : `Ungültige Kalenderwoche: KW ${isoWeek}/${isoYear}.`,
    );
    this.name = "InvalidIsoWeekError";
  }
}

const DAY_MS = 86_400_000;

/** Montag der KW 1 als UTC-Datum, ohne Prüfung. */
function firstIsoMonday(isoYear: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7; // 0 = Montag
  return new Date(Date.UTC(isoYear, 0, 4 - jan4Weekday));
}

/** Anzahl der ISO-Kalenderwochen eines Jahres: 52 oder 53. */
export function isoWeeksInYear(isoYear: number): number {
  return Math.round((firstIsoMonday(isoYear + 1).getTime() - firstIsoMonday(isoYear).getTime()) / (7 * DAY_MS));
}

/** Gibt es die Woche? Ganzzahlig, von 1 bis zur Wochenzahl des Jahres (AK-1204). */
export function isValidIsoWeek(isoYear: number, isoWeek: number): boolean {
  return Number.isInteger(isoYear) && Number.isInteger(isoWeek) && isoWeek >= 1 && isoWeek <= isoWeeksInYear(isoYear);
}

/** Montag der ISO-Woche als UTC-Datum. Eine Woche, die es nicht gibt, wird abgewiesen (AK-1204). */
export function isoWeekMonday(isoYear: number, isoWeek: number): Date {
  if (!isValidIsoWeek(isoYear, isoWeek)) {
    throw new InvalidIsoWeekError(isoYear, isoWeek);
  }
  return new Date(firstIsoMonday(isoYear).getTime() + (isoWeek - 1) * 7 * DAY_MS);
}

/** Montag bis Freitag der ISO-Woche. */
export function isoWeekWorkdays(isoYear: number, isoWeek: number): Date[] {
  const monday = isoWeekMonday(isoYear, isoWeek);
  return Array.from({ length: 5 }, (_, i) => new Date(monday.getTime() + i * 86_400_000));
}

/** Datum als TT.MM.JJJJ (Kalendertag, unabhängig von der Zeitzone). */
export function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

/** Datum als JJJJ-MM-TT, z. B. für Formularfelder. */
export function toDateInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Text der Woche, z. B. „KW 40/2026 (28.09.2026 – 02.10.2026)“. */
export function weekLabel(isoYear: number, isoWeek: number): string {
  const days = isoWeekWorkdays(isoYear, isoWeek);
  return `KW ${isoWeek}/${isoYear} (${formatDate(days[0])} – ${formatDate(days[4])})`;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

/** Kurzer Wochentag, z. B. „Mo“. */
export function weekdayShort(date: Date): string {
  return WEEKDAYS[date.getUTCDay()];
}

/** Eine ISO-Kalenderwoche. */
export interface IsoWeek {
  isoYear: number;
  isoWeek: number;
}

/** ISO-Woche, in der der Kalendertag liegt (Datum als UTC-Mitternacht). */
export function isoWeekOf(date: Date): IsoWeek {
  const weekday = (date.getUTCDay() + 6) % 7; // 0 = Montag
  // Der Donnerstag derselben Woche bestimmt das ISO-Jahr.
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 3 - weekday));
  const isoYear = thursday.getUTCFullYear();
  const isoWeek = 1 + Math.floor((thursday.getTime() - firstIsoMonday(isoYear).getTime()) / (7 * DAY_MS));
  return { isoYear, isoWeek };
}

/** Vergleicht zwei Wochen: negativ, wenn `a` früher liegt, 0 bei gleicher Woche. */
export function compareWeeks(a: IsoWeek, b: IsoWeek): number {
  return a.isoYear !== b.isoYear ? a.isoYear - b.isoYear : a.isoWeek - b.isoWeek;
}

/** Die darauffolgende ISO-Woche. */
export function nextIsoWeek(week: IsoWeek): IsoWeek {
  return isoWeekOf(new Date(isoWeekMonday(week.isoYear, week.isoWeek).getTime() + 7 * DAY_MS));
}

/**
 * Kalendertag eines Zeitpunkts in der angegebenen Zeitzone, als UTC-Mitternacht.
 * Beispiel: 2026-10-04T22:30:00Z ist in Europe/Berlin schon Montag, der 05.10.2026.
 */
export function calendarDateIn(instant: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
}

/** Heutiger Kalendertag in Europe/Berlin (UTC-Mitternacht), z. B. aus `now()` des Uhr-Moduls. */
export function today(now: Date): Date {
  return calendarDateIn(now, APP_TIME_ZONE);
}

/** Aktuelle ISO-Woche in Europe/Berlin. */
export function currentIsoWeek(now: Date): IsoWeek {
  return isoWeekOf(today(now));
}

/** Zeitraum Mo–Fr als Text, z. B. „28.09.2026 – 02.10.2026“. */
export function weekRangeLabel(isoYear: number, isoWeek: number): string {
  const days = isoWeekWorkdays(isoYear, isoWeek);
  return `${formatDate(days[0])} – ${formatDate(days[4])}`;
}

const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;

/** Ausgeschriebener Wochentag, z. B. „Montag“. */
export function weekdayLong(date: Date): string {
  return WEEKDAYS_LONG[date.getUTCDay()];
}

/** Kurzer Zeitraum Mo–Fr für Kacheln, z. B. „05.10.–09.10.“. */
export function weekRangeShort(isoYear: number, isoWeek: number): string {
  const days = isoWeekWorkdays(isoYear, isoWeek);
  return `${formatDate(days[0]).slice(0, 6)}–${formatDate(days[4]).slice(0, 6)}`;
}
