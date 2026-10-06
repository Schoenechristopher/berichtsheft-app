/**
 * PDF-Export (AK-901 – AK-907): was gedruckt wird.
 *
 * Reine Funktionen ohne Abhängigkeit zu UI, Datenbank oder PDF-Bibliothek. Sie bestimmen, welche
 * Wochen zu einem Zeitraum gehören, welcher Freigabevermerk bzw. welche Kennzeichnung eine Woche
 * trägt und wie die Datei heißt. Das Layout selbst steht in `src/pdf/`.
 */
import type { ReportStatus } from "./report-access";
import { DAY_TYPE_LABELS } from "./report-days";
import { classifyWeek, isWeekOutsideTraining, type DayType, type TrainingPeriod } from "./report-generation";
import { currentApproval, formatDateTime, type HistoryChange } from "./report-history";
import { STATUS_LABELS } from "./report-status";
import { formatDate, isoWeekWorkdays, toDateInput, weekRangeLabel, weekdayLong, type IsoWeek } from "./weeks";

/** Freigabevermerk (AK-903) oder Kennzeichnung einer nicht freigegebenen Woche (AK-904). */
export type PdfMarking =
  | { kind: "APPROVED"; approverName: string; approvedAt: Date; text: string; short: string }
  | { kind: "NOT_APPROVED"; status: ReportStatus; text: string; short: string };

/**
 * Vermerk einer Woche: nur wenn sie aktuell freigegeben ist, mit Name und Zeitpunkt der aktuell
 * gültigen Freigabe (`currentApproval`). Nach einer Rücknahme ist der Status „Abgelehnt“, also gibt
 * es keinen Vermerk mehr (AK-905), sondern die Kennzeichnung „Nicht freigegeben“.
 */
export function pdfMarking(status: ReportStatus, changes: readonly HistoryChange[]): PdfMarking {
  const approval = currentApproval(status, changes);
  if (approval) {
    return {
      kind: "APPROVED",
      approverName: approval.actorName,
      approvedAt: approval.at,
      text: `Freigegeben von ${approval.actorName} am ${formatDateTime(approval.at)}`,
      short: "Freigegeben",
    };
  }
  const label = STATUS_LABELS[status];
  return {
    kind: "NOT_APPROVED",
    status,
    text: `Nicht freigegeben – Status: ${label}`,
    short: `Nicht freigegeben (${label})`,
  };
}

/** Tag, so wie er gedruckt wird. */
export interface PdfDay {
  /** z. B. „Montag, 28.09.2026“ */
  label: string;
  /** Tagesart, „Tagesart noch offen“ oder „außerhalb der Ausbildung“. */
  dayTypeLabel: string;
  outsideTraining: boolean;
  /** Tätigkeiten unverändert (AK-907). */
  activities: string;
}

/** Woche, so wie sie gedruckt wird. */
export interface PdfWeek extends IsoWeek {
  traineeName: string;
  /** z. B. „KW 40/2026“ */
  title: string;
  /** z. B. „28.09.2026 – 02.10.2026“ (Mo–Fr) */
  range: string;
  statusLabel: string;
  marking: PdfMarking;
  /** Ganze Woche außerhalb der Ausbildung (sichtbar, weil mit Inhalt oder Historie). */
  outsideTraining: boolean;
  days: PdfDay[];
}

/** Gespeicherter Tag, soweit für den Druck nötig. */
export interface DayForPdf {
  date: Date;
  dayType: DayType | null;
  activities: string;
  outsideTraining: boolean;
}

/** Gespeicherter Bericht, soweit für den Druck nötig. */
export interface ReportForPdf extends IsoWeek {
  status: ReportStatus;
  days: readonly DayForPdf[];
  changes: readonly HistoryChange[];
}

/** Bezeichnung der Tagesart im PDF (wie auf der Berichtsseite, plus gespeicherte Tagesart außerhalb). */
export function pdfDayTypeLabel(day: Pick<DayForPdf, "dayType" | "outsideTraining">): string {
  if (day.outsideTraining) {
    return day.dayType ? `außerhalb der Ausbildung (${DAY_TYPE_LABELS[day.dayType]})` : "außerhalb der Ausbildung";
  }
  return day.dayType ? DAY_TYPE_LABELS[day.dayType] : "Tagesart noch offen";
}

/** Baut die Druckdaten einer Woche (AK-901). */
export function toPdfWeek(report: ReportForPdf, traineeName: string, period: TrainingPeriod | null): PdfWeek {
  const days = [...report.days].sort((a, b) => a.date.getTime() - b.date.getTime());
  return {
    isoYear: report.isoYear,
    isoWeek: report.isoWeek,
    traineeName,
    title: `KW ${report.isoWeek}/${report.isoYear}`,
    range: weekRangeLabel(report.isoYear, report.isoWeek),
    statusLabel: STATUS_LABELS[report.status],
    marking: pdfMarking(report.status, report.changes),
    outsideTraining: period !== null && isWeekOutsideTraining(report, period),
    days: days.map((day) => ({
      label: `${weekdayLong(day.date)}, ${formatDate(day.date)}`,
      dayTypeLabel: pdfDayTypeLabel(day),
      outsideTraining: day.outsideTraining,
      activities: day.activities,
    })),
  };
}

/** Zeitraum eines Sammel-PDF; Daten als UTC-Mitternacht (Kalendertage), beide Grenzen inklusive. */
export interface ExportRange {
  from: Date;
  to: Date;
}

/**
 * Gehört die Woche zum Zeitraum? Vorschlag: jede Woche, deren Mo–Fr den Zeitraum berührt – also
 * mindestens ein Arbeitstag der Woche liegt zwischen „von“ und „bis“. Gedruckt wird dann immer die
 * ganze Woche.
 */
export function isWeekInRange(week: IsoWeek, range: ExportRange): boolean {
  const days = isoWeekWorkdays(week.isoYear, week.isoWeek);
  return days[0].getTime() <= range.to.getTime() && days[4].getTime() >= range.from.getTime();
}

/** Bericht mit dem, was für Auswahl und Ausblendung im Sammel-PDF nötig ist. */
export interface WeekForExport extends IsoWeek {
  status: ReportStatus;
  hasContent: boolean;
  hasHistory: boolean;
}

/**
 * Wochen eines Sammel-PDF (AK-902): alle Berichte, die den Zeitraum berühren, in zeitlicher
 * Reihenfolge. Ausgeblendete Wochen (unberührte leere Entwürfe ganz außerhalb der Ausbildung,
 * bestätigte Auslegung zu AK-306) erscheinen nicht – dieselbe Regel wie in der Übersicht.
 */
export function selectExportWeeks<T extends WeekForExport>(
  reports: readonly T[],
  range: ExportRange,
  period: TrainingPeriod,
): T[] {
  return reports
    .filter((report) => isWeekInRange(report, range))
    .filter((report) => !classifyWeek(report, period, report).hidden)
    .sort((a, b) => (a.isoYear !== b.isoYear ? a.isoYear - b.isoYear : a.isoWeek - b.isoWeek));
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Kalendertag aus „JJJJ-MM-TT“ oder null, wenn ungültig (z. B. 31.02.). */
export function parseDateInput(value: string | null | undefined): Date | null {
  const match = DATE_PATTERN.exec(value?.trim() ?? "");
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/**
 * Vorbelegung des Zeitraums: Ausbildungsbeginn bis heute; ist die Ausbildung schon beendet, bis
 * zum Ausbildungsende.
 */
export function defaultExportRange(period: TrainingPeriod, today: Date): ExportRange {
  const to = period.end && period.end.getTime() < today.getTime() ? period.end : today;
  return { from: period.start, to: to.getTime() < period.start.getTime() ? period.start : to };
}

export const RANGE_MESSAGES = {
  invalidFrom: "Bitte ein gültiges Datum für „Von“ eingeben.",
  invalidTo: "Bitte ein gültiges Datum für „Bis“ eingeben.",
  order: "„Bis“ darf nicht vor „Von“ liegen.",
} as const;

export type RangeResult = { ok: true; range: ExportRange } | { ok: false; message: string };

/**
 * Zeitraum aus den Formularfeldern „von“ und „bis“ (JJJJ-MM-TT). Fehlt ein Feld, gilt die
 * Vorbelegung; ein ungültiges Datum oder „bis“ vor „von“ wird abgewiesen.
 */
export function parseExportRange(
  from: string | null | undefined,
  to: string | null | undefined,
  fallback: ExportRange,
): RangeResult {
  const fromDate = from?.trim() ? parseDateInput(from) : fallback.from;
  if (!fromDate) {
    return { ok: false, message: RANGE_MESSAGES.invalidFrom };
  }
  const toDate = to?.trim() ? parseDateInput(to) : fallback.to;
  if (!toDate) {
    return { ok: false, message: RANGE_MESSAGES.invalidTo };
  }
  if (toDate.getTime() < fromDate.getTime()) {
    return { ok: false, message: RANGE_MESSAGES.order };
  }
  return { ok: true, range: { from: fromDate, to: toDate } };
}

/** Zeitraum als Text, z. B. „01.09.2026 – 09.10.2026“. */
export function rangeLabel(range: ExportRange): string {
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

const TRANSLITERATION: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };

/**
 * Name als Teil eines Dateinamens: Umlaute umschreiben, Akzente entfernen, Leerzeichen zu „-“,
 * alles andere außer Buchstaben, Ziffern und „-“ weglassen. Z. B. „Anna Müller“ → „Anna-Mueller“.
 */
export function fileNamePart(name: string): string {
  const ascii = name
    .replace(/[äöüÄÖÜß]/g, (char) => TRANSLITERATION[char])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  const part = ascii
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return part || "Azubi";
}

/** Dateiname einer Woche, z. B. „Berichtsheft_Anna-Azubi_KW40-2026.pdf“. */
export function weekPdfFileName(traineeName: string, week: IsoWeek): string {
  return `Berichtsheft_${fileNamePart(traineeName)}_KW${week.isoWeek}-${week.isoYear}.pdf`;
}

/** Dateiname eines Sammel-PDF, z. B. „Berichtsheft_Anna-Azubi_2026-09-01_bis_2026-10-09.pdf“. */
export function rangePdfFileName(traineeName: string, range: ExportRange): string {
  return `Berichtsheft_${fileNamePart(traineeName)}_${toDateInput(range.from)}_bis_${toDateInput(range.to)}.pdf`;
}

/** Inhalt eines PDF: eine Woche oder alle Wochen eines Zeitraums. */
export interface PdfDocument {
  /** Titel in den Dokumenteigenschaften. */
  title: string;
  traineeName: string;
  /** Erstellungszeitpunkt als Text, z. B. „06.10.2026, 21:00 Uhr“ (aus dem Uhr-Modul). */
  createdAt: string;
  weeks: PdfWeek[];
  /** Nur Sammel-PDF: gewählter Zeitraum als Text. */
  rangeLabel?: string;
}

/** PDF einer Woche (AK-901). `now` kommt aus dem Uhr-Modul. */
export function weekPdfDocument(
  report: ReportForPdf,
  traineeName: string,
  period: TrainingPeriod | null,
  now: Date,
): PdfDocument {
  const week = toPdfWeek(report, traineeName, period);
  return {
    title: `Berichtsheft ${traineeName} – ${week.title}`,
    traineeName,
    createdAt: formatDateTime(now),
    weeks: [week],
  };
}

/**
 * Sammel-PDF eines Zeitraums (AK-902): die Wochen laut `selectExportWeeks`, in zeitlicher
 * Reihenfolge. `now` kommt aus dem Uhr-Modul.
 */
export function rangePdfDocument(
  reports: readonly (ReportForPdf & WeekForExport)[],
  traineeName: string,
  period: TrainingPeriod,
  range: ExportRange,
  now: Date,
): PdfDocument {
  const label = rangeLabel(range);
  return {
    title: `Berichtsheft ${traineeName} – ${label}`,
    traineeName,
    createdAt: formatDateTime(now),
    weeks: selectExportWeeks(reports, range, period).map((report) => toPdfWeek(report, traineeName, period)),
    rangeLabel: label,
  };
}
