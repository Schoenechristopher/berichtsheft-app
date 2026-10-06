/**
 * Kalenderwochen nach ISO 8601 (Montag bis Sonntag, KW 1 enthält den 4. Januar).
 * Reine Funktionen; Daten sind UTC-Mitternacht und stehen für Kalendertage.
 */

/** Montag der ISO-Woche als UTC-Datum. */
export function isoWeekMonday(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7; // 0 = Montag
  return new Date(Date.UTC(isoYear, 0, 4 - jan4Weekday + (isoWeek - 1) * 7));
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
