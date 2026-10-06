"use client";

import { useActionState } from "react";
import { FEDERAL_STATES } from "@/domain/federal-states";
import { Field, inputClass, primaryButtonClass } from "@/components/ui";
import type { FormState } from "../personen/actions";

/** Bundesland der Firma (AK-209). */
export function SettingsForm({
  action,
  federalState,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  federalState: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const error = state && !state.ok ? state.formError : undefined;
  return (
    <form action={formAction} className="space-y-4">
      <Field id="federalState" label="Bundesland der Firma" error={error} hint="Bestimmt die vorbelegten Feiertage.">
        <select
          id="federalState"
          name="federalState"
          defaultValue={federalState}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "federalState-error federalState-hint" : "federalState-hint"}
          className={inputClass}
        >
          {Object.entries(FEDERAL_STATES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full sm:w-auto`}>
        Speichern
      </button>
    </form>
  );
}
