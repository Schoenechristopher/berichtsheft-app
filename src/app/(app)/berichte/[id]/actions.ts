"use server";

import { revalidatePath } from "next/cache";
import type { DayErrors } from "@/domain/report-days";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { dayInputsFromForm, saveReportDays } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/** Zustand des Berichtsformulars nach dem Speichern. */
export type SaveState = {
  attempt: number;
  ok: boolean;
  formError?: string;
  dayErrors?: DayErrors;
  /** Zuletzt erfolgreich gespeicherte Werte je Tag (Grundlage für „ungespeicherte Änderungen“). */
  saved?: Record<string, { dayType: string; activities: string }>;
} | null;

/**
 * Entwurf speichern (AK-406). Prüft selbst Rolle und Besitz: `requirePerson()` verlangt eine
 * gültige Anmeldung, `saveReportDays` erlaubt nur dem eigenen, aktiven Azubi in „Entwurf“ oder
 * „Abgelehnt“ das Ändern (AK-103, AK-204).
 */
export async function saveReportAction(reportId: string, prev: SaveState, formData: FormData): Promise<SaveState> {
  const viewer = await requirePerson();
  const attempt = (prev?.attempt ?? 0) + 1;
  if (!isUuid(reportId)) {
    return { attempt, ok: false, formError: "Bericht nicht gefunden.", saved: prev?.saved };
  }
  const dayIds = formData.getAll("dayId").filter((value): value is string => typeof value === "string");
  const result = await saveReportDays(db(), viewer, reportId, dayInputsFromForm(formData, dayIds));
  if (!result.ok) {
    return { attempt, ok: false, formError: result.formError, dayErrors: result.dayErrors, saved: prev?.saved };
  }
  revalidatePath("/azubi");
  revalidatePath(`/berichte/${reportId}`);
  return {
    attempt,
    ok: true,
    saved: Object.fromEntries(result.days.map((day) => [day.id, { dayType: day.dayType, activities: day.activities }])),
  };
}
