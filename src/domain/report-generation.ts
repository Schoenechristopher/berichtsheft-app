/**
 * Entstehung der Wochenberichte (AK-301 – AK-305, AK-404) und Hervorhebung in der Übersicht (AK-306).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. „Jetzt“ wird übergeben (aus dem
 * Uhr-Modul); die aktuelle Woche bestimmt sich nach der Zeitzone Europe/Berlin.
 */
import { isPublicHoliday } from "./holidays";
import type { ReportStatus } from "./report-access";
import { isOpenStatus } from "./report-status";
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

/** „Offen“: eine Definition für Bearbeiten, Übersicht und Erinnerung (`report-status.ts`). */
export { OPEN_STATUSES } from "./report-status";

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
 * Liegt die ganze Woche (Mo–Fr) außerhalb der Ausbildung? Das kommt nur vor, wenn der
 * Ausbildungszeitraum nachträglich verkürzt oder der Beginn verschoben wurde (AK-203).
 * Berechnet aus dem aktuellen Zeitraum – wandert der Beginn zurück, gilt die Woche wieder.
 */
export function isWeekOutsideTraining(week: IsoWeek, period: TrainingPeriod): boolean {
  return isoWeekWorkdays(week.isoYear, week.isoWeek).every((date) => isOutsideTraining(date, period));
}

/** Woche in der Übersicht, soweit für Sichtbarkeit und Hervorhebung nötig. */
export interface WeekForOverview extends IsoWeek {
  status: ReportStatus;
  /** Hat ein Tag eine Tagesart oder einen Text? */
  hasContent: boolean;
  /** Gibt es Statuswechsel in der Historie? */
  hasHistory: boolean;
}

/** Einordnung einer Woche für Übersicht und (ab Etappe 6) Erinnerung. */
export interface WeekClassification {
  /** Unberührter leerer Entwurf ganz außerhalb der Ausbildung: nicht anzeigen. */
  hidden: boolean;
  /** Ganze Woche außerhalb der Ausbildung (mit Inhalt oder Historie sichtbar, so markiert). */
  outsideTraining: boolean;
  /**
   * Zählt als offen (Entwurf oder Abgelehnt, nicht ganz außerhalb der Ausbildung) – eine
   * Definition für Übersicht, Hervorhebung und (ab Etappe 6) Erinnerung.
   */
  open: boolean;
  /** Offen und vor der aktuellen Woche: deutlich hervorheben (AK-306). */
  pastOpen: boolean;
}

/**
 * Bestätigte Auslegung zu AK-203/AK-306: Wochen ganz außerhalb der Ausbildung zählen nie als
 * offen. Unberührte leere Entwürfe (kein Inhalt, keine Historie) werden ausgeblendet; Wochen mit
 * Inhalt oder Historie bleiben sichtbar und sind als „außerhalb der Ausbildung“ markiert.
 * Gelöscht wird nichts.
 */
export function classifyWeek(week: WeekForOverview, period: TrainingPeriod, current: IsoWeek): WeekClassification {
  const outsideTraining = isWeekOutsideTraining(week, period);
  const untouched = week.status === "DRAFT" && !week.hasContent && !week.hasHistory;
  const open = !outsideTraining && isOpenStatus(week.status);
  return {
    hidden: outsideTraining && untouched,
    outsideTraining,
    open,
    pastOpen: open && compareWeeks(week, current) < 0,
  };
}

/**
 * Offene Woche in der Vergangenheit (AK-306): Status „Entwurf“ oder „Abgelehnt“ und vor der
 * aktuellen Woche. Diese Wochen hebt die Übersicht deutlich hervor. Wochen ganz außerhalb der
 * Ausbildung schließt `classifyWeek` zusätzlich aus.
 */
export function isPastOpen(report: IsoWeek & { status: ReportStatus }, current: IsoWeek): boolean {
  return isOpenStatus(report.status) && compareWeeks(report, current) < 0;
}
