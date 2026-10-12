"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MAX_ACTIVITIES_LENGTH, activitiesError, activitiesLength, isDayType } from "@/domain/report-days";
import {
  SUBMISSION_PROBLEM_LABELS,
  submissionHeadline,
  validateSubmission,
  type SubmissionIssue,
} from "@/domain/report-submission";
import { AutoGrowTextarea } from "@/components/ui/autogrow";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/dialog";
import { DayTypeInput } from "@/components/ui/day-type";
import { CharacterCount, FieldError } from "@/components/ui/field";
import { AlertIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { useToast, useToastOffset } from "@/components/ui/toast";
import { useHydrated } from "@/components/ui/use-hydrated";
import type { SaveState } from "./actions";

export interface EditorDay {
  id: string;
  /** Kalendertag JJJJ-MM-TT */
  date: string;
  /** z. B. „Montag, 05.10.2026“ */
  label: string;
  outsideTraining: boolean;
  /** Gesetzlicher Feiertag im Bundesland: Hinweis „Feiertag (vorbelegt)“. */
  holiday: boolean;
  dayType: string;
  activities: string;
}

type Values = Record<string, { dayType: string; activities: string }>;
type Action = (prev: SaveState, formData: FormData) => Promise<SaveState>;

/** Hinweis beim Verlassen mit ungespeicherten Änderungen (AK-408). */
export const LEAVE_WARNING =
  "Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen verloren.";

/** Hinweis vor dem PDF-Download mit ungespeicherten Änderungen (bestätigte Auslegung zu AK-901). */
export const EXPORT_SAVED_HINT = "Es wird der zuletzt gespeicherte Stand exportiert.";

function valuesOf(days: EditorDay[]): Values {
  return Object.fromEntries(days.map((day) => [day.id, { dayType: day.dayType, activities: day.activities }]));
}

/** Einreichen bzw. erneut einreichen, mit dem Stand, den der Azubi gerade sieht (AK-508). */
export interface EditorSubmit {
  action: "SUBMIT" | "RESUBMIT";
  status: string;
  version: number;
}

/** Fokus auf ein Feld und es in den sichtbaren Bereich holen (Sprunglinks der Fehlerleiste). */
function focusField(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ block: "center" });
  element?.focus({ preventScroll: true });
}

/**
 * Woche erfassen (AK-401 – AK-408, UI-Spezifikation „Woche erfassen“): je Tag Tagesart und
 * „Tätigkeiten“, ab 1280 px fünf gleich breite Spalten, darunter Karten untereinander (UI-AK-06).
 * Die feste Fußleiste zeigt „Ungespeicherte Änderungen“ bzw. „Gespeichert“ (UI-AK-07), dazu
 * „Speichern“ und „Einreichen …“. Tage außerhalb der Ausbildung sind gesperrt. Geprüft wird immer
 * auf dem Server.
 *
 * Einreichen (AK-501 – AK-505, AK-701): Vor dem Bestätigungsdialog prüft die Seite die Pflichtfelder
 * mit derselben Funktion wie der Server, markiert fehlende Angaben am Tag und zeigt oben eine
 * Fehlerleiste mit Sprunglinks, die den Fokus erhält (UI-AK-08). Bestätigt der Azubi, speichert der
 * Server ungespeicherte Eingaben und reicht in derselben Transaktion ein (UI-AK-09). Kommentare des
 * Ausbilders aus der letzten Ablehnung stehen beim Tag (AK-606).
 */
export function ReportEditor({
  days,
  action,
  submit,
  dayComments = {},
}: {
  days: EditorDay[];
  action: Action;
  submit?: EditorSubmit;
  dayComments?: Record<string, string[]>;
}) {
  const toast = useToast();
  const hydrated = useHydrated();
  // Erfolg als Toast direkt nach der Antwort: Nach dem Einreichen ersetzt die Seite den Editor,
  // ein Effekt hier liefe dann nicht mehr.
  const [state, formAction, pending] = useActionState<SaveState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.ok) {
      toast.success(result.submitted ? "Woche eingereicht" : "Entwurf gespeichert");
    }
    return result;
  }, null);
  const [values, setValues] = useState<Values>(() => valuesOf(days));
  const [checkSubmission, setCheckSubmission] = useState(false);
  const [intent, setIntent] = useState<"save" | "submit">("save");
  const formRef = useRef<HTMLFormElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const issuesRef = useRef<HTMLDivElement>(null);
  // Die Fehlerleiste erhält nach einem gescheiterten Einreichen den Fokus (UI-AK-08), sobald sie da ist.
  const focusIssues = useRef(false);

  const baseline = state?.saved ?? valuesOf(days);
  const editable = days.filter((day) => !day.outsideTraining);
  const dirty = editable.some(
    (day) =>
      values[day.id].dayType !== baseline[day.id]?.dayType ||
      values[day.id].activities !== baseline[day.id]?.activities,
  );

  useLeaveWarning(dirty, formRef);
  useHistoryGuard(dirty);
  useToastOffset(footerRef, true);

  const dayErrors = state && !state.ok ? (state.dayErrors ?? {}) : {};
  const hasDayErrors = Object.keys(dayErrors).length > 0;

  // Fehler nach einer Antwort des Servers: Fehlerleiste mit Fokus, wenn Pflichtangaben fehlen,
  // sonst Fehler-Toast mit der Meldung aus der Fachlogik.
  const handled = useRef(0);
  useEffect(() => {
    if (!state || state.ok || handled.current === state.attempt) {
      return;
    }
    handled.current = state.attempt;
    if (state.submissionIssues?.length) {
      focusIssues.current = true;
      issuesRef.current?.focus();
    } else if (state.formError) {
      toast.error(state.formError);
    }
  }, [state, toast]);

  useEffect(() => {
    if (focusIssues.current && issuesRef.current) {
      focusIssues.current = false;
      issuesRef.current.focus();
    }
  });

  // Pflichtfelder (AK-501, AK-502): nach dem ersten Versuch laufend neu geprüft, damit die
  // Markierungen verschwinden, sobald der Tag ergänzt ist.
  const currentIssues = (): SubmissionIssue[] =>
    validateSubmission(
      days.map((day) => {
        const { dayType, activities } = values[day.id];
        return {
          id: day.id,
          date: new Date(`${day.date}T00:00:00Z`),
          outsideTraining: day.outsideTraining,
          dayType: isDayType(dayType) ? dayType : null,
          activities,
        };
      }),
    );
  const showIssues = checkSubmission || (state?.submissionIssues?.length ?? 0) > 0;
  const issues = showIssues ? currentIssues() : [];
  const issueOf = new Map(issues.map((issue) => [issue.dayId, issue.problem]));

  const update = (id: string, field: "dayType" | "activities", value: string) =>
    setValues((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      aria-label="Bericht erfassen"
      className="space-y-4"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        setIntent(submitter?.getAttribute("value") === "submit" ? "submit" : "save");
      }}
    >
      {issues.length > 0 ? (
        <div
          ref={issuesRef}
          tabIndex={-1}
          role="alert"
          data-testid="submission-issues"
          className="border-danger bg-rejected-bg text-rejected space-y-2 rounded-md border p-3 text-sm"
        >
          <p className="flex items-center gap-2 font-medium">
            <AlertIcon className="h-5 w-5" />
            {submissionHeadline(issues)}
          </p>
          <ul className="space-y-1 pl-7">
            {issues.map((issue) => {
              const target =
                issue.problem === "DAY_TYPE_MISSING" ? `dayType-${issue.dayId}` : `activities-${issue.dayId}`;
              return (
                <li key={issue.dayId}>
                  <a
                    href={`#${target}`}
                    className="underline underline-offset-2"
                    onClick={(event) => {
                      event.preventDefault();
                      focusField(target);
                    }}
                  >
                    {issue.dayLabel}: {SUBMISSION_PROBLEM_LABELS[issue.problem]}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {hasDayErrors ? <Notice tone="error">Nicht gespeichert – bitte die markierten Felder prüfen.</Notice> : null}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        {days.map((day) => {
          const value = values[day.id];
          const errors = dayErrors[day.id] ?? {};
          const length = activitiesLength(value.activities);
          const tooLong = activitiesError(value.activities) ?? errors.activities;
          const typeId = `dayType-${day.id}`;
          const textId = `activities-${day.id}`;
          const problem = issueOf.get(day.id);
          const typeError =
            errors.dayType ?? (problem === "DAY_TYPE_MISSING" ? SUBMISSION_PROBLEM_LABELS[problem] : undefined);
          const textError =
            tooLong ?? (problem === "ACTIVITIES_MISSING" ? SUBMISSION_PROBLEM_LABELS[problem] : undefined);
          const comments = dayComments[day.id] ?? [];
          return (
            <fieldset
              key={day.id}
              disabled={day.outsideTraining}
              data-testid="report-day"
              data-outside-training={day.outsideTraining ? "true" : undefined}
              data-issue={problem}
              className={`rounded-card flex min-w-0 flex-col gap-3 border p-4 ${
                day.outsideTraining
                  ? "border-border bg-surface-muted text-fg-muted"
                  : problem
                    ? "border-danger bg-surface border-2"
                    : "border-border bg-surface"
              }`}
            >
              <legend className="sr-only">{day.label}</legend>
              <p aria-hidden="true">
                <span className="block font-semibold">{day.label.split(", ")[0]}</span>
                <span className="text-fg-muted block text-sm tabular-nums">{day.label.split(", ")[1]}</span>
              </p>
              {problem ? (
                <p className="text-danger flex items-center gap-1.5 text-sm font-medium">
                  <AlertIcon className="h-4 w-4" />
                  <span data-testid="day-issue">{SUBMISSION_PROBLEM_LABELS[problem]}</span>
                </p>
              ) : null}
              {comments.map((comment, index) => (
                <p
                  key={index}
                  className="border-overdue/40 bg-overdue-bg text-overdue rounded-md border p-2 text-sm break-words whitespace-pre-wrap"
                  data-testid="day-comment"
                >
                  <span className="font-medium">Kommentar des Ausbilders: </span>
                  {comment}
                </p>
              ))}
              {day.outsideTraining ? (
                <p className="text-sm">Außerhalb der Ausbildung – keine Angaben nötig.</p>
              ) : (
                <input type="hidden" name="dayId" value={day.id} />
              )}
              <div className="space-y-1.5">
                <label id={`${typeId}-label`} htmlFor={typeId} className="block text-sm font-medium">
                  Tagesart
                </label>
                <DayTypeInput
                  id={typeId}
                  name={typeId}
                  value={value.dayType}
                  onChange={(next) => update(day.id, "dayType", next)}
                  disabled={day.outsideTraining || !hydrated}
                  invalid={!!typeError}
                  describedBy={typeError ? `${typeId}-error` : undefined}
                  holidayPreset={day.holiday}
                  placeholder={day.outsideTraining ? "–" : "Bitte wählen"}
                />
                {typeError ? <FieldError id={`${typeId}-error`}>{typeError}</FieldError> : null}
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor={textId} className="block text-sm font-medium">
                  Tätigkeiten
                </label>
                <AutoGrowTextarea
                  id={textId}
                  name={textId}
                  rows={4}
                  readOnly={!hydrated}
                  value={value.activities}
                  onChange={(event) => update(day.id, "activities", event.target.value)}
                  aria-invalid={textError && !day.outsideTraining ? true : undefined}
                  aria-describedby={`${textId}-count${textError ? ` ${textId}-error` : ""}`}
                  className="flex-1 xl:min-h-72"
                />
                <CharacterCount
                  id={`${textId}-count`}
                  length={length}
                  max={MAX_ACTIVITIES_LENGTH}
                  always
                  hidden={day.outsideTraining}
                />
                {textError && !day.outsideTraining ? <FieldError id={`${textId}-error`}>{textError}</FieldError> : null}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div
        ref={footerRef}
        className="border-border bg-surface sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 lg:-mx-8 lg:px-8"
      >
        <p role="status" className="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${dirty && !pending ? "bg-overdue" : "bg-approved"}`}
          />
          <span data-testid="save-status">
            {pending
              ? intent === "submit"
                ? "Wird eingereicht …"
                : "Wird gespeichert …"
              : dirty
                ? "Ungespeicherte Änderungen"
                : "Gespeichert"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            name="intent"
            value="save"
            variant={submit ? "secondary" : "primary"}
            pending={pending && intent === "save"}
            pendingLabel="Wird gespeichert …"
            disabled={pending}
          >
            Speichern
          </Button>
          {submit ? (
            <>
              <input type="hidden" name="action" value={submit.action} />
              <input type="hidden" name="status" value={submit.status} />
              <input type="hidden" name="version" value={submit.version} />
              <ConfirmSubmit
                label={submit.action === "RESUBMIT" ? "Erneut einreichen" : "Einreichen"}
                title={submit.action === "RESUBMIT" ? "Bericht erneut einreichen?" : "Bericht einreichen?"}
                message={
                  <p>
                    Nach dem Einreichen ist der Bericht schreibgeschützt, bis Sie ihn zurückziehen oder er abgelehnt
                    wird.
                    {dirty ? " Ihre ungespeicherten Änderungen werden dabei gespeichert." : ""}
                  </p>
                }
                variant="primary"
                name="intent"
                value="submit"
                disabled={pending}
                pending={pending && intent === "submit"}
                pendingLabel="Wird eingereicht …"
                beforeOpen={() => {
                  setCheckSubmission(true);
                  const ok = currentIssues().length === 0;
                  if (!ok) {
                    focusIssues.current = true;
                  }
                  return ok;
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/**
 * Warnt beim Verlassen mit ungespeicherten Änderungen (AK-408): beim Schließen oder Neuladen
 * über den Browser-Dialog, bei Links und anderen Formularen (z. B. „Abmelden“) in der App über
 * eine Rückfrage. Zurück und Vor im Browser fängt `useHistoryGuard` ab.
 */
function useLeaveWarning(dirty: boolean, formRef: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Ältere Browser zeigen den Dialog nur mit gesetztem returnValue.
      event.returnValue = "";
    };
    const cancelUnlessConfirmed = (event: Event) => {
      if (!window.confirm(LEAVE_WARNING)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (link.getAttribute("target") === "_blank" || link.getAttribute("href")?.startsWith("#")) {
        return;
      }
      // Downloads (PDF) verlassen die Seite nicht, exportieren aber nur den gespeicherten Stand:
      // Hinweis; Abbrechen bleibt im Editor.
      if (link.hasAttribute("download")) {
        if (!window.confirm(EXPORT_SAVED_HINT)) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      cancelUnlessConfirmed(event);
    };
    const onSubmit = (event: SubmitEvent) => {
      if (event.target !== formRef.current) {
        cancelUnlessConfirmed(event);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [dirty, formRef]);
}

/**
 * Zurück/Vor im Browser (AK-408): Innerhalb der App navigiert Next.js dabei ohne `beforeunload`.
 * Sobald es ungespeicherte Änderungen gibt, legt die Seite deshalb einen Schutzeintrag mit
 * derselben Adresse in den Verlauf. „Zurück“ verlässt zuerst nur diesen Eintrag – die Seite bleibt –
 * und fragt nach: Abbrechen legt den Schutzeintrag erneut an, Bestätigen geht wirklich zurück.
 * Spätere Einträge („Vor“) verwirft der Browser beim Anlegen; dorthin geht also nichts verloren.
 * Ist nach dem Speichern nichts mehr offen, überspringt „Zurück“ den Schutzeintrag ohne Rückfrage.
 */
function useHistoryGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  const guardActive = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
    if (dirty && !guardActive.current && !leaving.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      guardActive.current = true;
    }
  }, [dirty]);

  useEffect(() => {
    const onPopState = () => {
      if (!guardActive.current || leaving.current) {
        return;
      }
      guardActive.current = false;
      if (dirtyRef.current && !window.confirm(LEAVE_WARNING)) {
        window.history.pushState(window.history.state, "", window.location.href);
        guardActive.current = true;
        return;
      }
      leaving.current = true;
      window.history.back();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}
