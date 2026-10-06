"use client";

import { useActionState, useState } from "react";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import {
  Field,
  Notice,
  dangerButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { isBlank, TRANSITION_MESSAGES } from "@/domain/report-status";
import type { TransitionState } from "./actions";

type Action = (prev: TransitionState, formData: FormData) => Promise<TransitionState>;

/** Stand, den die Person sieht – für das bedingte Update (AK-508). */
export interface Seen {
  status: string;
  version: number;
}

function SeenFields({ seen }: { seen: Seen }) {
  return (
    <>
      <input type="hidden" name="status" value={seen.status} />
      <input type="hidden" name="version" value={seen.version} />
    </>
  );
}

function FormError({ state }: { state: TransitionState }) {
  return state && !state.ok && state.formError ? <Notice tone="error">{state.formError}</Notice> : null;
}

/** Tag in der Prüfansicht: Inhalt nur lesend, dazu optionaler Tageskommentar (AK-605). */
export interface ReviewDay {
  id: string;
  label: string;
  outsideTraining: boolean;
  dayTypeLabel: string;
  activities: string;
}

/**
 * Prüfen (AK-602 – AK-605): Tage lesen, optional je Tag kommentieren, dann freigeben oder mit
 * Gesamtkommentar ablehnen. Beides mit Bestätigungsdialog; der Server prüft Rolle, Status und
 * Version selbst und meldet z. B. „Bericht wurde zurückgezogen“ (AK-508).
 */
export function ReviewForm({
  action,
  seen,
  days,
  canReject,
}: {
  action: Action;
  seen: Seen;
  days: ReviewDay[];
  /** Nein bei deaktiviertem Azubi (Vorschlag zur Bestätigung): dann nur Freigeben. */
  canReject: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [comment, setComment] = useState("");
  const [dayComments, setDayComments] = useState<Record<string, string>>({});
  const [commentMissing, setCommentMissing] = useState(false);
  const commentError =
    (commentMissing && isBlank(comment) ? TRANSITION_MESSAGES.commentRequired : undefined) ??
    (state && !state.ok ? state.fieldErrors?.comment : undefined);
  const hasDayComments = Object.values(dayComments).some((text) => !isBlank(text));

  return (
    <form action={formAction} className="space-y-4" aria-label="Bericht prüfen" noValidate>
      <SeenFields seen={seen} />
      <FormError state={state} />
      <ul className="space-y-2" aria-label="Tage">
        {days.map((day) => {
          const id = `dayComment-${day.id}`;
          const error = state && !state.ok ? state.fieldErrors?.dayComments?.[day.id] : undefined;
          return (
            <li
              key={day.id}
              data-testid="report-day"
              className={`space-y-2 rounded-lg border border-slate-200 p-3 ${day.outsideTraining ? "bg-slate-100 text-slate-500" : "bg-white"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{day.label}</span>
                <span className="text-sm">{day.dayTypeLabel}</span>
              </div>
              {day.activities ? <p className="text-sm break-words whitespace-pre-wrap">{day.activities}</p> : null}
              {canReject ? (
                <Field id={id} label={`Kommentar zu ${day.label} (optional)`} error={error}>
                  <textarea
                    id={id}
                    name={id}
                    rows={2}
                    value={dayComments[day.id] ?? ""}
                    onChange={(event) => setDayComments((current) => ({ ...current, [day.id]: event.target.value }))}
                    aria-invalid={error ? true : undefined}
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              ) : null}
            </li>
          );
        })}
      </ul>
      {canReject ? (
        <Field id="comment" label="Gesamtkommentar (Pflicht beim Ablehnen)" error={commentError}>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-invalid={commentError ? true : undefined}
            aria-describedby={commentError ? "comment-error" : undefined}
            className={`${inputClass} resize-y`}
          />
        </Field>
      ) : (
        <Notice tone="info">{TRANSITION_MESSAGES.traineeInactiveReview}</Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <ConfirmSubmit
          label="Freigeben"
          title="Bericht freigeben?"
          message={
            <p>
              Der Bericht wird freigegeben und ist danach für niemanden mehr änderbar – außer über „Freigabe
              zurücknehmen“.
              {hasDayComments || !isBlank(comment)
                ? " Eingegebene Kommentare werden bei der Freigabe nicht gespeichert."
                : ""}
            </p>
          }
          buttonClass={primaryButtonClass}
          name="action"
          value="APPROVE"
          disabled={pending}
        />
        {canReject ? (
          <ConfirmSubmit
            label="Ablehnen"
            title="Bericht ablehnen?"
            message={
              <p>Der Azubi sieht Ihren Gesamtkommentar und die Tageskommentare und kann den Bericht überarbeiten.</p>
            }
            buttonClass={dangerButtonClass}
            name="action"
            value="REJECT"
            disabled={pending}
            beforeOpen={() => {
              setCommentMissing(true);
              return !isBlank(comment);
            }}
          />
        ) : null}
      </div>
    </form>
  );
}

/** Zurückziehen durch den Azubi (AK-506), nur solange „Eingereicht“. */
export function WithdrawForm({ action, seen }: { action: Action; seen: Seen }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3" aria-label="Bericht zurückziehen">
      <SeenFields seen={seen} />
      <FormError state={state} />
      <ConfirmSubmit
        label="Zurückziehen"
        title="Bericht zurückziehen?"
        message={<p>Der Bericht wird wieder zum Entwurf, Sie können ihn bearbeiten und erneut einreichen.</p>}
        buttonClass={secondaryButtonClass}
        name="action"
        value="WITHDRAW"
        disabled={pending}
      />
    </form>
  );
}

/** Freigabe zurücknehmen (AK-703): nur mit Begründung, danach „Abgelehnt“. */
export function RevokeForm({ action, seen }: { action: Action; seen: Seen }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const error =
    (checked && isBlank(reason) ? TRANSITION_MESSAGES.reasonRequired : undefined) ??
    (state && !state.ok ? state.fieldErrors?.reason : undefined);
  return (
    <form action={formAction} className="space-y-3" aria-label="Freigabe zurücknehmen" noValidate>
      <SeenFields seen={seen} />
      <FormError state={state} />
      <Field id="reason" label="Begründung für die Rücknahme" error={error}>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "reason-error" : undefined}
          className={`${inputClass} resize-y`}
        />
      </Field>
      <ConfirmSubmit
        label="Freigabe zurücknehmen"
        title="Freigabe zurücknehmen?"
        message={
          <p>
            Der Bericht wird „Abgelehnt“ und für den Azubi wieder bearbeitbar. Die Begründung steht in der Historie.
          </p>
        }
        buttonClass={dangerButtonClass}
        name="action"
        value="REVOKE_APPROVAL"
        disabled={pending}
        beforeOpen={() => {
          setChecked(true);
          return !isBlank(reason);
        }}
      />
    </form>
  );
}
