/**
 * Regeln zum Erfassen eines Berichts (AK-401 – AK-403, AK-405, AK-407).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. Oberfläche und Server nutzen sie
 * gemeinsam; geprüft wird immer auf dem Server.
 */
import type { DayType } from "./report-generation";

/** Genau diese fünf Tagesarten stehen zur Auswahl (AK-402), in dieser Reihenfolge. */
export const DAY_TYPES: readonly DayType[] = ["WORK", "SCHOOL", "VACATION", "SICK", "HOLIDAY"];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  WORK: "Betrieb",
  SCHOOL: "Berufsschule",
  VACATION: "Urlaub",
  SICK: "Krank",
  HOLIDAY: "Feiertag",
};

export function isDayType(value: unknown): value is DayType {
  return typeof value === "string" && (DAY_TYPES as readonly string[]).includes(value);
}

/** Obergrenze für „Tätigkeiten“ pro Tag; die Spezifikation verlangt mindestens 2.000 Zeichen (AK-407). */
export const MAX_ACTIVITIES_LENGTH = 5000;

/**
 * Text so, wie er gespeichert wird: unverändert, nur Zeilenumbrüche einheitlich als „\n“
 * (Browser senden Formularwerte mit „\r\n“). Keine Kürzung, kein Trimmen (AK-407).
 */
export function normalizeActivities(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** Anzahl Zeichen, wie Nutzer sie zählen (Unicode-Zeichen, Zeilenumbruch = 1). */
export function activitiesLength(text: string): number {
  return Array.from(normalizeActivities(text)).length;
}

/** Meldung am Feld, wenn der Text zu lang ist; sonst undefined. */
export function activitiesError(text: string): string | undefined {
  const length = activitiesLength(text);
  if (length <= MAX_ACTIVITIES_LENGTH) {
    return undefined;
  }
  return `Höchstens ${MAX_ACTIVITIES_LENGTH.toLocaleString("de-DE")} Zeichen – bitte um ${(length - MAX_ACTIVITIES_LENGTH).toLocaleString("de-DE")} kürzen.`;
}

/** Gespeicherter Tag, soweit für das Speichern nötig. */
export interface EditableDay {
  id: string;
  outsideTraining: boolean;
}

/** Eingabe eines Tages aus dem Formular; `null` = Feld nicht mitgeschickt (bleibt unverändert). */
export interface DayInput {
  dayType: string | null;
  activities: string | null;
}

/** Zu speichernde Werte eines Tages. */
export interface DayUpdate {
  id: string;
  dayType: DayType | null;
  activities: string;
}

/**
 * Hat der Bericht Inhalt (M03, „offen“ und Ausblendung, M03-R14 / AK-306)? Mindestens ein Tag mit
 * Tagesart oder Text.
 */
export function hasContent(days: readonly { dayType: string | null; activities: string | null }[]): boolean {
  return days.some((day) => day.dayType !== null || (day.activities ?? "") !== "");
}

export type DayErrors = Record<string, { dayType?: string; activities?: string }>;

export type DaysValidation = { ok: true; updates: DayUpdate[] } | { ok: false; errors: DayErrors };

/**
 * Prüft die Eingaben aller Tage eines Berichts. Tage außerhalb der Ausbildung sind ausgegraut und
 * werden nicht geändert (AK-305). Eine leere Tagesart ist beim Speichern eines Entwurfs erlaubt;
 * Pflicht wird sie erst beim Einreichen (Etappe 4).
 */
export function validateDayInputs(
  days: readonly EditableDay[],
  inputs: ReadonlyMap<string, DayInput>,
  current: ReadonlyMap<string, { dayType: DayType | null; activities: string }>,
): DaysValidation {
  const errors: DayErrors = {};
  const updates: DayUpdate[] = [];
  for (const day of days) {
    const input = inputs.get(day.id);
    const stored = current.get(day.id);
    if (day.outsideTraining || !input || !stored) {
      continue;
    }
    let dayType = stored.dayType;
    if (input.dayType !== null) {
      if (input.dayType === "") {
        dayType = null;
      } else if (isDayType(input.dayType)) {
        dayType = input.dayType;
      } else {
        errors[day.id] = { ...errors[day.id], dayType: "Bitte eine der fünf Tagesarten wählen." };
      }
    }
    const activities = input.activities === null ? stored.activities : normalizeActivities(input.activities);
    const tooLong = activitiesError(activities);
    if (tooLong) {
      errors[day.id] = { ...errors[day.id], activities: tooLong };
    }
    if (dayType !== stored.dayType || activities !== stored.activities) {
      updates.push({ id: day.id, dayType, activities });
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, updates };
}
