/**
 * Fortschritt einer Woche für Start Azubi und die Wochen-Kachel (UI-Spezifikation): je Tag
 * „ausgefüllt“, „leer“ oder „außerhalb“, dazu „3 von 5 Tagen ausgefüllt“. „Ausgefüllt“ heißt: Der
 * Tag erfüllt die Pflichtangaben fürs Einreichen (AK-501). Reine Funktionen.
 */
import { validateSubmission, type DayForSubmission } from "./report-submission";
import { weekdayShort } from "./weeks";

export type DayMark = "filled" | "empty" | "outside";

export interface DayProgress {
  date: Date;
  /** „Mo“ … „Fr“ */
  weekday: string;
  mark: DayMark;
}

export interface WeekProgress {
  days: DayProgress[];
  filled: number;
  /** Tage innerhalb der Ausbildung */
  total: number;
}

export function weekProgress(days: readonly Omit<DayForSubmission, "id">[]): WeekProgress {
  const withIds = [...days]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((day, index) => ({ ...day, id: String(index) }));
  const incomplete = new Set(validateSubmission(withIds).map((issue) => issue.dayId));
  const marks = withIds.map((day): DayProgress => ({
    date: day.date,
    weekday: weekdayShort(day.date),
    mark: day.outsideTraining ? "outside" : incomplete.has(day.id) ? "empty" : "filled",
  }));
  return {
    days: marks,
    filled: marks.filter((day) => day.mark === "filled").length,
    total: marks.filter((day) => day.mark !== "outside").length,
  };
}

/** „3 von 5 Tagen ausgefüllt“ bzw. „1 von 1 Tag ausgefüllt“. */
export function progressLabel(progress: Pick<WeekProgress, "filled" | "total">): string {
  return `${progress.filled} von ${progress.total} ${progress.total === 1 ? "Tag" : "Tagen"} ausgefüllt`;
}

/** Erste Zeile eines Kommentars für Listen (z. B. Ablehnung unter „Zu erledigen“). */
export function firstLine(text: string, maxLength = 120): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line.length > maxLength ? `${line.slice(0, maxLength - 1).trimEnd()}…` : line;
}
