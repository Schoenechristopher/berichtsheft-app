"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  DAY_TYPES,
  DAY_TYPE_LABELS,
  MAX_ACTIVITIES_LENGTH,
  activitiesError,
  activitiesLength,
} from "@/domain/report-days";
import { Notice, inputClass, primaryButtonClass } from "@/components/ui";
import type { SaveState } from "./actions";

export interface EditorDay {
  id: string;
  /** z. B. „Montag, 05.10.2026“ */
  label: string;
  outsideTraining: boolean;
  dayType: string;
  activities: string;
}

type Values = Record<string, { dayType: string; activities: string }>;
type Action = (prev: SaveState, formData: FormData) => Promise<SaveState>;

/** Hinweis beim Verlassen mit ungespeicherten Änderungen (AK-408). */
export const LEAVE_WARNING =
  "Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen verloren.";

const numberFormat = new Intl.NumberFormat("de-DE");

function valuesOf(days: EditorDay[]): Values {
  return Object.fromEntries(days.map((day) => [day.id, { dayType: day.dayType, activities: day.activities }]));
}

/**
 * Bericht erfassen (AK-401 – AK-408): pro Tag Tagesart und „Tätigkeiten“, ausdrücklicher
 * „Speichern“-Knopf, Warnung beim Verlassen mit ungespeicherten Änderungen. Tage außerhalb der
 * Ausbildung sind ausgegraut und gesperrt. Geprüft wird immer auf dem Server.
 */
export function ReportEditor({ days, action }: { days: EditorDay[]; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [values, setValues] = useState<Values>(() => valuesOf(days));
  const formRef = useRef<HTMLFormElement>(null);

  const baseline = state?.saved ?? valuesOf(days);
  const editable = days.filter((day) => !day.outsideTraining);
  const dirty = editable.some(
    (day) =>
      values[day.id].dayType !== baseline[day.id]?.dayType ||
      values[day.id].activities !== baseline[day.id]?.activities,
  );

  useLeaveWarning(dirty, formRef);
  useHistoryGuard(dirty);

  const dayErrors = state && !state.ok ? (state.dayErrors ?? {}) : {};
  const hasDayErrors = Object.keys(dayErrors).length > 0;

  const update = (id: string, field: "dayType" | "activities", value: string) =>
    setValues((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate aria-label="Bericht erfassen">
      {state && !state.ok && state.formError ? <Notice tone="error">{state.formError}</Notice> : null}
      {hasDayErrors ? <Notice tone="error">Nicht gespeichert – bitte die markierten Felder prüfen.</Notice> : null}

      {days.map((day) => {
        const value = values[day.id];
        const errors = dayErrors[day.id] ?? {};
        const length = activitiesLength(value.activities);
        const tooLong = activitiesError(value.activities) ?? errors.activities;
        const typeId = `dayType-${day.id}`;
        const textId = `activities-${day.id}`;
        return (
          <fieldset
            key={day.id}
            disabled={day.outsideTraining}
            data-testid="report-day"
            data-outside-training={day.outsideTraining ? "true" : undefined}
            className={`min-w-0 space-y-3 rounded-lg border p-3 ${
              day.outsideTraining ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-white"
            }`}
          >
            <legend className="px-1 font-medium">{day.label}</legend>
            {day.outsideTraining ? (
              <p className="text-sm">Außerhalb der Ausbildung – keine Angaben nötig.</p>
            ) : (
              <input type="hidden" name="dayId" value={day.id} />
            )}
            <div className="space-y-1">
              <label htmlFor={typeId} className="block text-sm font-medium">
                Tagesart
              </label>
              <select
                id={typeId}
                name={typeId}
                value={value.dayType}
                onChange={(event) => update(day.id, "dayType", event.target.value)}
                aria-invalid={errors.dayType ? true : undefined}
                aria-describedby={errors.dayType ? `${typeId}-error` : undefined}
                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
              >
                <option value="">{day.outsideTraining ? "–" : "Bitte wählen"}</option>
                {DAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DAY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              {errors.dayType ? (
                <p id={`${typeId}-error`} className="text-sm text-red-700">
                  {errors.dayType}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label htmlFor={textId} className="block text-sm font-medium">
                Tätigkeiten
              </label>
              <textarea
                id={textId}
                name={textId}
                rows={4}
                value={value.activities}
                onChange={(event) => update(day.id, "activities", event.target.value)}
                aria-invalid={tooLong ? true : undefined}
                aria-describedby={`${textId}-count${tooLong ? ` ${textId}-error` : ""}`}
                className={`${inputClass} resize-y disabled:bg-slate-100 disabled:text-slate-500`}
              />
              <p
                id={`${textId}-count`}
                hidden={day.outsideTraining}
                className={`text-xs ${length > MAX_ACTIVITIES_LENGTH ? "text-red-700" : "text-slate-500"}`}
              >
                {numberFormat.format(length)} / {numberFormat.format(MAX_ACTIVITIES_LENGTH)} Zeichen
              </p>
              {tooLong && !day.outsideTraining ? (
                <p id={`${textId}-error`} className="text-sm text-red-700">
                  {tooLong}
                </p>
              ) : null}
            </div>
          </fieldset>
        );
      })}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        <span role="status" className="text-sm text-slate-600" data-testid="save-status">
          {pending
            ? ""
            : dirty
              ? "Ungespeicherte Änderungen"
              : state?.ok
                ? "Gespeichert."
                : "Alle Änderungen gespeichert."}
        </span>
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
