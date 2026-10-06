"use server";

import { revalidatePath } from "next/cache";
import type { ReportStatus } from "@/domain/report-access";
import type { DayErrors } from "@/domain/report-days";
import { REPORT_STATUSES, type ReportAction } from "@/domain/report-status";
import type { SubmissionIssue } from "@/domain/report-submission";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { transitionReport, type TransitionResult } from "@/lib/report-transitions";
import { dayInputsFromForm, saveReportDays } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

type SavedValues = Record<string, { dayType: string; activities: string }>;

/** Zustand des Berichtsformulars nach dem Speichern oder Einreichen. */
export type SaveState = {
  attempt: number;
  ok: boolean;
  formError?: string;
  dayErrors?: DayErrors;
  /** Fehlende Pflichtangaben nach einem gescheiterten Einreichen (AK-502). */
  submissionIssues?: SubmissionIssue[];
  /** Zuletzt erfolgreich gespeicherte Werte je Tag (Grundlage für „ungespeicherte Änderungen“). */
  saved?: SavedValues;
} | null;

/** Zustand der Formulare für Zurückziehen, Freigeben, Ablehnen und Rücknahme. */
export type TransitionState = {
  attempt: number;
  ok: boolean;
  formError?: string;
  fieldErrors?: Extract<TransitionResult, { ok: false }>["fieldErrors"];
} | null;

/**
 * Entwurf speichern (AK-406) oder – mit `intent=submit` – speichern und einreichen (AK-501 – AK-505,
 * AK-701). Prüft selbst Rolle und Besitz: `requirePerson()` verlangt eine gültige Anmeldung,
 * `saveReportDays` bzw. `transitionReport` erlauben nur dem eigenen, aktiven Azubi das Ändern
 * (AK-103, AK-204).
 */
export async function saveReportAction(reportId: string, prev: SaveState, formData: FormData): Promise<SaveState> {
  const viewer = await requirePerson();
  const attempt = (prev?.attempt ?? 0) + 1;
  if (!isUuid(reportId)) {
    return { attempt, ok: false, formError: "Bericht nicht gefunden.", saved: prev?.saved };
  }
  const dayIds = formData.getAll("dayId").filter((value): value is string => typeof value === "string");
  const inputs = dayInputsFromForm(formData, dayIds);

  if (formData.get("intent") === "submit") {
    const action = formData.get("action") === "RESUBMIT" ? "RESUBMIT" : "SUBMIT";
    const result = await transitionReport(db(), viewer, reportId, {
      action,
      seen: seenFromForm(formData),
      dayInputs: inputs,
    });
    // Nur nach eigenem Speichern bzw. Einreichen neu lesen – beides setzt den Besitz voraus.
    // Bei einem Fehler bleibt die Seite stehen, damit die Meldung sichtbar bleibt.
    const saved = result.ok || result.savedDraft ? await savedValues(reportId) : prev?.saved;
    if (result.ok) {
      revalidateReport(reportId);
    }
    if (result.ok) {
      return { attempt, ok: true, saved };
    }
    return {
      attempt,
      ok: false,
      formError: result.formError,
      dayErrors: result.dayErrors,
      submissionIssues: result.submissionIssues,
      saved,
    };
  }

  const result = await saveReportDays(db(), viewer, reportId, inputs);
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

const FORM_ACTIONS: readonly ReportAction[] = ["WITHDRAW", "APPROVE", "REJECT", "REVOKE_APPROVAL"];

/**
 * Zurückziehen (AK-506), Freigeben (AK-603), Ablehnen mit Kommentaren (AK-604, AK-605) und
 * Freigabe zurücknehmen (AK-703). Rolle, Besitz, Status und Version prüft `transitionReport`.
 */
export async function transitionAction(
  reportId: string,
  prev: TransitionState,
  formData: FormData,
): Promise<TransitionState> {
  const viewer = await requirePerson();
  const attempt = (prev?.attempt ?? 0) + 1;
  const action = formData.get("action");
  if (!FORM_ACTIONS.includes(action as ReportAction)) {
    return { attempt, ok: false, formError: "Unbekannte Aktion." };
  }
  const dayComments = new Map<string, string>();
  for (const [key, value] of formData) {
    if (key.startsWith("dayComment-") && typeof value === "string") {
      dayComments.set(key.slice("dayComment-".length), value);
    }
  }
  const text = formData.get(action === "REVOKE_APPROVAL" ? "reason" : "comment");
  const result = await transitionReport(db(), viewer, reportId, {
    action: action as ReportAction,
    seen: seenFromForm(formData),
    text: typeof text === "string" ? text : null,
    dayComments,
  });
  if (result.ok) {
    // Bei einem Fehler bleibt die Seite stehen, damit die Meldung (z. B. AK-508) sichtbar bleibt.
    revalidateReport(reportId);
  }
  return result.ok
    ? { attempt, ok: true }
    : { attempt, ok: false, formError: result.formError, fieldErrors: result.fieldErrors };
}

/** Stand, den die Person beim Öffnen gesehen hat (verborgene Felder `status` und `version`). */
function seenFromForm(formData: FormData): { status: ReportStatus; version: number } | undefined {
  const status = formData.get("status");
  const version = Number(formData.get("version"));
  if (!REPORT_STATUSES.includes(status as ReportStatus) || !Number.isInteger(version)) {
    return undefined;
  }
  return { status: status as ReportStatus, version };
}

async function savedValues(reportId: string): Promise<SavedValues> {
  const days = await db().reportDay.findMany({ where: { reportId } });
  return Object.fromEntries(days.map((day) => [day.id, { dayType: day.dayType ?? "", activities: day.activities }]));
}

function revalidateReport(reportId: string) {
  revalidatePath("/azubi");
  revalidatePath("/ausbilder");
  revalidatePath("/ausbilder/pruefliste");
  revalidatePath(`/berichte/${reportId}`);
}
