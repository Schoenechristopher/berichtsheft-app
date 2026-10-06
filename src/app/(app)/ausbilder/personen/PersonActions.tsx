"use client";

import { useActionState } from "react";
import { Field, Notice, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import type { FormState } from "./actions";

type ButtonAction = (prev: FormState) => Promise<FormState>;
type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Deaktivieren bzw. wieder aktivieren; Ablehnungen (AK-207, AK-208) erscheinen direkt darüber. */
export function StatusButton({ action, label, testId }: { action: ButtonAction; label: string; testId: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-2" data-testid={testId}>
      {state && !state.ok && state.formError ? <Notice tone="error">{state.formError}</Notice> : null}
      <button type="submit" disabled={pending} className={`${secondaryButtonClass} w-full sm:w-auto`}>
        {label}
      </button>
    </form>
  );
}

/**
 * Endgültig löschen (AK-206) mit Namensbestätigung. Kommt die Person in fremder Historie vor,
 * erklärt die Meldung das und bietet stattdessen „Deaktivieren“ an.
 */
export function DeleteForm({
  name,
  action,
  deactivateAction,
}: {
  name: string;
  action: FormAction;
  deactivateAction: ButtonAction;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const confirmError = state && !state.ok ? state.fieldErrors?.confirmName : undefined;
  const offerDeactivate = state && !state.ok && state.offerDeactivate;

  return (
    <div className="space-y-3">
      {state && !state.ok && state.formError ? <Notice tone="error">{state.formError}</Notice> : null}
      {offerDeactivate ? (
        <StatusButton action={deactivateAction} label="Stattdessen deaktivieren" testId="offer-deactivate" />
      ) : null}
      <form action={formAction} className="space-y-3" key={state?.attempt ?? 0}>
        <Field id="confirmName" label={`Zur Bestätigung den Namen eintippen: ${name}`} error={confirmError}>
          <input
            id="confirmName"
            name="confirmName"
            type="text"
            autoComplete="off"
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={confirmError ? "confirmName-error" : undefined}
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={pending} className={`${dangerButtonClass} w-full sm:w-auto`}>
          Endgültig löschen
        </button>
      </form>
    </div>
  );
}
