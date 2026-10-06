"use client";

import { useActionState, useState } from "react";
import { FIELD_LABELS, type PersonField, type PersonInput } from "@/domain/people";
import { Field, Notice, inputClass, primaryButtonClass } from "@/components/ui";
import type { FormState } from "./actions";

export interface TrainerOption {
  id: string;
  name: string;
  active: boolean;
}

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Formular zum Anlegen und Bearbeiten einer Person. Fehlermeldungen stehen beim jeweiligen
 * Feld (AK-202); geprüft wird immer auf dem Server.
 */
export function PersonForm({
  action,
  initial,
  trainers,
  submitLabel,
  emailHint,
}: {
  action: Action;
  initial: PersonInput;
  trainers: TrainerOption[];
  submitLabel: string;
  emailHint?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  // Nach jeder Antwort neu aufbauen, damit die zuletzt eingegebenen Werte stehen bleiben.
  return (
    <PersonFormFields
      key={state?.attempt ?? 0}
      formAction={formAction}
      pending={pending}
      state={state}
      values={state?.values ?? initial}
      trainers={trainers}
      submitLabel={submitLabel}
      emailHint={emailHint}
    />
  );
}

function PersonFormFields({
  formAction,
  pending,
  state,
  values,
  trainers,
  submitLabel,
  emailHint,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: FormState;
  values: PersonInput;
  trainers: TrainerOption[];
  submitLabel: string;
  emailHint?: string;
}) {
  const [role, setRole] = useState(values.role ?? "");
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok ? state.formError : undefined;

  const a11y = (field: PersonField, hint = false) => ({
    id: field,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby":
      [errors[field] ? `${field}-error` : null, hint ? `${field}-hint` : null].filter(Boolean).join(" ") || undefined,
  });

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {Object.keys(errors).length > 0 ? <Notice tone="error">Bitte die markierten Felder prüfen.</Notice> : null}

      <Field id="name" label={FIELD_LABELS.name} error={errors.name}>
        <input
          {...a11y("name")}
          type="text"
          autoComplete="off"
          defaultValue={values.name ?? ""}
          className={inputClass}
        />
      </Field>

      <Field id="email" label={FIELD_LABELS.email} error={errors.email} hint={emailHint}>
        <input
          {...a11y("email", !!emailHint)}
          type="email"
          autoComplete="off"
          inputMode="email"
          defaultValue={values.email ?? ""}
          className={inputClass}
        />
      </Field>

      <Field id="role" label={FIELD_LABELS.role} error={errors.role}>
        <select {...a11y("role")} value={role} onChange={(event) => setRole(event.target.value)} className={inputClass}>
          <option value="">Bitte wählen</option>
          <option value="TRAINEE">Azubi</option>
          <option value="TRAINER">Ausbilder</option>
        </select>
      </Field>

      {role === "TRAINEE" ? (
        <fieldset className="space-y-4 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Ausbildung</legend>
          <Field id="trainerId" label={FIELD_LABELS.trainerId} error={errors.trainerId}>
            <select {...a11y("trainerId")} defaultValue={values.trainerId ?? ""} className={inputClass}>
              <option value="">Bitte wählen</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
                  {trainer.active ? "" : " (deaktiviert)"}
                </option>
              ))}
            </select>
          </Field>
          <Field id="trainingStart" label={FIELD_LABELS.trainingStart} error={errors.trainingStart}>
            <input
              {...a11y("trainingStart")}
              type="date"
              defaultValue={values.trainingStart ?? ""}
              className={inputClass}
            />
          </Field>
          <Field id="trainingEnd" label={`${FIELD_LABELS.trainingEnd} (optional)`} error={errors.trainingEnd}>
            <input
              {...a11y("trainingEnd")}
              type="date"
              defaultValue={values.trainingEnd ?? ""}
              className={inputClass}
            />
          </Field>
        </fieldset>
      ) : null}

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full sm:w-auto`}>
        {pending ? "Wird gespeichert …" : submitLabel}
      </button>
    </form>
  );
}
