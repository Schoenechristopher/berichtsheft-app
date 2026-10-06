/**
 * Entstehung der Wochenberichte (AK-301 – AK-305, AK-404) und Hervorhebung in der Übersicht (AK-306).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. „Jetzt“ wird übergeben (aus dem
 * Uhr-Modul); die aktuelle Woche bestimmt sich nach der Zeitzone Europe/Berlin.
 */
import { isPublicHoliday } from "./holidays";
import type { ReportStatus } from "./report-access";
import { calendarDateIn, compareWeeks, isoWeekOf, isoWeekWorkdays, nextIsoWeek, type IsoWeek } from "./weeks";

/** Zeitzone der Firma: bestimmt, wann eine neue Woche beginnt. */
export const APP_TIME_ZONE = "Europe/Berlin";

/** Ausbildungszeitraum; Daten als UTC-Mitternacht, Ende optional. */
export interface TrainingPeriod {
  start: Date;
  end: Date | null;
}

export type DayType = "WORK" | "SCHOOL" | "VACATION" | "SICK" | "HOLIDAY";

/** Tag eines neu anzulegenden Berichts. */
export interface PlannedDay {
  date: Date;
  dayType: DayType | null;
  outsideTraining: boolean;
}

/** Heutiger Kalendertag in Europe/Berlin (UTC-Mitternacht). */
export function today(now: Date): Date {
  return calendarDateIn(now, APP_TIME_ZONE);
}

/** Aktuelle ISO-Woche in Europe/Berlin. */
export function currentIsoWeek(now: Date): IsoWeek {
  return isoWeekOf(today(now));
}

/**
 * Wochen, für die ein Bericht existieren muss (AK-301 – AK-303): von der Woche des
 * Ausbildungsbeginns bis zur aktuellen Woche, höchstens bis zur Woche des Ausbildungsendes.
 * Zukünftige Wochen nie.
 */
export function weeksDue(period: TrainingPeriod, now: Date): IsoWeek[] {
  const current = currentIsoWeek(now);
  const endWeek = period.end ? isoWeekOf(period.end) : null;
  const last = endWeek && compareWeeks(endWeek, current) < 0 ? endWeek : current;
  const weeks: IsoWeek[] = [];
  for (let week = isoWeekOf(period.start); compareWeeks(week, last) <= 0; week = nextIsoWeek(week)) {
    weeks.push(week);
  }
  return weeks;
}

/** Liegt der Kalendertag vor Beginn oder nach Ende der Ausbildung (AK-305)? */
export function isOutsideTraining(date: Date, period: TrainingPeriod): boolean {
  return date.getTime() < period.start.getTime() || (period.end !== null && date.getTime() > period.end.getTime());
}

/**
 * Die fünf Tage Mo–Fr eines neuen Berichts: Tage außerhalb der Ausbildung markiert (AK-305),
 * gesetzliche Feiertage des Bundeslands innerhalb der Ausbildung als „Feiertag“ vorbelegt (AK-404).
 */
export function planReportDays(week: IsoWeek, period: TrainingPeriod, federalState: string): PlannedDay[] {
  return isoWeekWorkdays(week.isoYear, week.isoWeek).map((date) => {
    const outsideTraining = isOutsideTraining(date, period);
    return {
      date,
      outsideTraining,
      dayType: !outsideTraining && isPublicHoliday(date, federalState) ? "HOLIDAY" : null,
    };
  });
}

/** Gespeicherter Tag, soweit für die Neuberechnung nötig. */
export interface StoredDay {
  id: string;
  date: Date;
  dayType: DayType | null;
  outsideTraining: boolean;
}

/** Änderung an einem gespeicherten Tag nach geändertem Ausbildungszeitraum. */
export interface DayCorrection {
  id: string;
  outsideTraining: boolean;
  dayType?: DayType;
}

/** Status, in denen der Azubi den Bericht noch bearbeiten kann („offen“). */
export const OPEN_STATUSES: readonly ReportStatus[] = ["DRAFT", "REJECTED"];

/**
 * Nach einer Änderung des Ausbildungszeitraums (AK-203): die Markierung „außerhalb der Ausbildung“
 * eines noch bearbeitbaren Berichts neu berechnen. Eingetragene Inhalte bleiben immer erhalten.
 * Ein Tag, der neu in die Ausbildung fällt, noch keine Tagesart hat und ein Feiertag ist, wird
 * als „Feiertag“ vorbelegt – wie beim Anlegen.
 */
export function correctOutsideTraining(
  days: readonly StoredDay[],
  period: TrainingPeriod,
  federalState: string,
): DayCorrection[] {
  const corrections: DayCorrection[] = [];
  for (const day of days) {
    const outsideTraining = isOutsideTraining(day.date, period);
    if (outsideTraining === day.outsideTraining) {
      continue;
    }
    const correction: DayCorrection = { id: day.id, outsideTraining };
    if (!outsideTraining && day.dayType === null && isPublicHoliday(day.date, federalState)) {
      correction.dayType = "HOLIDAY";
    }
    corrections.push(correction);
  }
  return corrections;
}

/**
 * Offene Woche in der Vergangenheit (AK-306): Status „Entwurf“ oder „Abgelehnt“ und vor der
 * aktuellen Woche. Diese Wochen hebt die Übersicht deutlich hervor.
 */
export function isPastOpen(report: IsoWeek & { status: ReportStatus }, current: IsoWeek): boolean {
  return OPEN_STATUSES.includes(report.status) && compareWeeks(report, current) < 0;
}
