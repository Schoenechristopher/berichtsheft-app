/**
 * Pflichtfelder beim Einreichen (AK-501 – AK-504).
 *
 * Reine Funktion, gemeinsam für Oberfläche (Vorschau vor dem Bestätigungsdialog) und Server
 * (verbindlich, in derselben Transaktion wie der Statuswechsel).
 */
import type { DayType } from "./report-generation";
import { formatDate, weekdayLong, weekdayShort } from "./weeks";

/** Tag, soweit die Prüfung ihn braucht. */
export interface DayForSubmission {
  id: string;
  date: Date;
  dayType: DayType | null | "";
  activities: string;
  outsideTraining: boolean;
}

export type SubmissionProblem = "DAY_TYPE_MISSING" | "ACTIVITIES_MISSING";

/** Markierung am Tag (AK-502), wörtlich wie in den Beispielszenarien. */
export const SUBMISSION_PROBLEM_LABELS: Record<SubmissionProblem, string> = {
  DAY_TYPE_MISSING: "Tagesart fehlt",
  ACTIVITIES_MISSING: "Tätigkeiten fehlen",
};

export interface SubmissionIssue {
  dayId: string;
  /** z. B. „Freitag, 25.12.2026“ */
  dayLabel: string;
  /** z. B. „Fr“ für die Fehlerleiste */
  dayShort: string;
  problem: SubmissionProblem;
}

/** Tagesarten, die einen Tätigkeitstext brauchen; Urlaub, Krank und Feiertag nicht (AK-503). */
const NEEDS_ACTIVITIES: readonly DayType[] = ["WORK", "SCHOOL"];

/**
 * Prüft, ob ein Bericht eingereicht werden darf (AK-501): Jeder Tag innerhalb der Ausbildung hat
 * eine Tagesart, und jeder Tag mit „Betrieb“ oder „Berufsschule“ einen nicht leeren Text (nur
 * Leerraum gilt als leer). Tage außerhalb der Ausbildung sind keine Pflicht (AK-305). Eine Woche
 * nur aus Urlaub und Feiertagen ist damit vollständig und muss eingereicht werden (AK-504).
 * Gibt die betroffenen Tage in Kalenderreihenfolge zurück (AK-502); leer = einreichbar.
 */
export function validateSubmission(days: readonly DayForSubmission[]): SubmissionIssue[] {
  return [...days]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .flatMap((day): SubmissionIssue[] => {
      if (day.outsideTraining) {
        return [];
      }
      const dayLabel = `${weekdayLong(day.date)}, ${formatDate(day.date)}`;
      const dayShort = weekdayShort(day.date);
      if (!day.dayType) {
        return [{ dayId: day.id, dayLabel, dayShort, problem: "DAY_TYPE_MISSING" }];
      }
      if (NEEDS_ACTIVITIES.includes(day.dayType) && day.activities.trim() === "") {
        return [{ dayId: day.id, dayLabel, dayShort, problem: "ACTIVITIES_MISSING" }];
      }
      return [];
    });
}

/**
 * Überschrift der Fehlerleiste nach einem gescheiterten Einreichen (UI-AK-08), z. B.
 * „2 Tage sind unvollständig: Mi, Fr“. Die Leiste nennt darunter jeden Tag mit Sprunglink.
 */
export function submissionHeadline(issues: readonly Pick<SubmissionIssue, "dayShort">[]): string {
  const days = issues.map((issue) => issue.dayShort).join(", ");
  return issues.length === 1 ? `1 Tag ist unvollständig: ${days}` : `${issues.length} Tage sind unvollständig: ${days}`;
}

/** Zusammenfassung über dem Formular, nennt alle betroffenen Tage (AK-502). */
export function submissionSummary(issues: readonly SubmissionIssue[]): string {
  const list = issues.map((issue) => `${issue.dayLabel}: ${SUBMISSION_PROBLEM_LABELS[issue.problem]}`).join("; ");
  return `Nicht eingereicht – bitte ergänzen: ${list}.`;
}

/** Bestätigte Auslegung (Etappe 4): Wochen ganz außerhalb der Ausbildung werden nicht eingereicht. */
export const WEEK_OUTSIDE_TRAINING_MESSAGE =
  "Diese Woche liegt ganz außerhalb der Ausbildung und wird nicht eingereicht.";
