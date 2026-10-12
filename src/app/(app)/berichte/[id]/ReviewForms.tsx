"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { ConfirmSubmit, ConfirmWithReason } from "@/components/ui/dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useErrorToast, useToast } from "@/components/ui/toast";
import { isBlank, TRANSITION_MESSAGES, type ReportAction } from "@/domain/report-status";
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

const SUCCESS_MESSAGES: Partial<Record<ReportAction, string>> = {
  APPROVE: "Bericht freigegeben",
  REJECT: "Bericht abgelehnt",
  WITHDRAW: "Bericht zurückgezogen",
  REVOKE_APPROVAL: "Freigabe zurückgenommen",
};

/**
 * Serveraktion mit Rückmeldung: Erfolg als Toast direkt nach der Antwort (die Seite ersetzt das
 * Formular danach), Fehler als Fehler-Toast mit der Meldung aus der Fachlogik (z. B. AK-508). Mit
 * `nextHref` geht es nach Erfolg weiter, z. B. in der Prüfansicht zum nächsten Bericht (UI-AK-11).
 */
function useTransition(action: Action, nextHref?: string) {
  const toast = useToast();
  const router = useRouter();
  const result = useActionState<TransitionState, FormData>(async (prev, formData) => {
    const state = await action(prev, formData);
    if (state?.ok) {
      const message = state.action ? SUCCESS_MESSAGES[state.action] : undefined;
      if (message) {
        toast.success(message);
      }
      if (nextHref) {
        router.push(nextHref);
      }
    }
    return state;
  }, null);
  useErrorToast(result[0]);
  return result;
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
 * Prüfen (AK-602 – AK-605, UI-Spezifikation „Prüfansicht“): Tage als Zeilen (links Tag, Datum und
 * Tagesart, rechts der Text), je Tag „Kommentar zu diesem Tag“, das ein Feld öffnet. Die
 * Entscheidungsleiste steht fest unten: „Ablehnen …“ mit Pflicht-Gesamtkommentar im Dialog, der
 * die Zahl der Tageskommentare nennt, und „Freigeben“ mit Bestätigungsdialog. Der Server prüft
 * Rolle, Status und Version selbst und meldet z. B. „Bericht wurde zurückgezogen“ (AK-508).
 */
export function ReviewForm({
  action,
  seen,
  days,
  canReject,
  nextHref,
}: {
  action: Action;
  seen: Seen;
  days: ReviewDay[];
  /** Nein bei deaktiviertem Azubi (bestätigte Auslegung): dann nur Freigeben. */
  canReject: boolean;
  /** Prüfansicht: nach der Entscheidung zum nächsten Bericht der Liste. */
  nextHref?: string;
}) {
  const [state, formAction, pending] = useTransition(action, nextHref);
  const [dayComments, setDayComments] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const commentCount = Object.values(dayComments).filter((text) => !isBlank(text)).length;
  const serverCommentError = state && !state.ok ? state.fieldErrors?.comment : undefined;
  const baseId = useId();

  return (
    <form action={formAction} className="space-y-4" aria-label="Bericht prüfen" noValidate>
      <SeenFields seen={seen} />
      <ul className="divide-border rounded-card border-border bg-surface divide-y border" aria-label="Tage">
        {days.map((day) => {
          const id = `dayComment-${day.id}`;
          const error = state && !state.ok ? state.fieldErrors?.dayComments?.[day.id] : undefined;
          const open = openComments[day.id] || !!error;
          return (
            <li
              key={day.id}
              data-testid="report-day"
              className={`grid gap-x-6 gap-y-2 p-4 md:grid-cols-[12rem_1fr] ${day.outsideTraining ? "bg-surface-muted text-fg-muted" : ""}`}
            >
              <div>
                <p className="font-medium">{day.label}</p>
                <p className="text-fg-muted text-sm">{day.dayTypeLabel}</p>
              </div>
              <div className="min-w-0 space-y-2">
                {day.activities ? (
                  <p className="break-words whitespace-pre-wrap">{day.activities}</p>
                ) : (
                  <p className="text-fg-muted text-sm">Keine Tätigkeiten eingetragen.</p>
                )}
                {canReject ? (
                  open ? (
                    <Field id={id} label={`Kommentar zu ${day.label} (optional)`} error={error}>
                      <textarea
                        id={id}
                        name={id}
                        rows={2}
                        value={dayComments[day.id] ?? ""}
                        onChange={(event) =>
                          setDayComments((current) => ({ ...current, [day.id]: event.target.value }))
                        }
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className={`${inputClass} resize-y`}
                        autoFocus={!error}
                      />
                    </Field>
                  ) : (
                    <button
                      type="button"
                      id={`${baseId}-${day.id}`}
                      onClick={() => setOpenComments((current) => ({ ...current, [day.id]: true }))}
                      className="text-accent inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline lg:min-h-8"
                    >
                      Kommentar zu diesem Tag<span className="sr-only"> ({day.label})</span>
                    </button>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {canReject ? null : <Notice tone="info">{TRANSITION_MESSAGES.traineeInactiveReview}</Notice>}
      <div
        data-testid="decision-bar"
        className="border-border bg-surface sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t py-3"
      >
        {canReject ? (
          <ConfirmWithReason
            label="Ablehnen"
            title="Bericht ablehnen?"
            message={
              <p>
                Der Azubi sieht Ihren Gesamtkommentar und die Tageskommentare und kann den Bericht überarbeiten.{" "}
                {commentCount === 0
                  ? "Es gibt keine Tageskommentare."
                  : commentCount === 1
                    ? "Dazu kommt 1 Tageskommentar."
                    : `Dazu kommen ${commentCount} Tageskommentare.`}
              </p>
            }
            fieldLabel="Gesamtkommentar (Pflicht beim Ablehnen)"
            fieldName="comment"
            requiredMessage={TRANSITION_MESSAGES.commentRequired}
            name="action"
            value="REJECT"
            disabled={pending}
            serverError={serverCommentError}
          />
        ) : null}
        <ConfirmSubmit
          label="Freigeben"
          title="Bericht freigeben?"
          message={
            <p>
              Der Bericht wird freigegeben und ist danach für niemanden mehr änderbar – außer über „Freigabe
              zurücknehmen“.
              {commentCount > 0 ? " Eingegebene Kommentare werden bei der Freigabe nicht gespeichert." : ""}
            </p>
          }
          variant="primary"
          name="action"
          value="APPROVE"
          disabled={pending}
          pending={pending}
          pendingLabel="Wird gespeichert …"
        />
      </div>
    </form>
  );
}

/** Zurückziehen durch den Azubi (AK-506), nur solange „Eingereicht“. */
export function WithdrawForm({ action, seen }: { action: Action; seen: Seen }) {
  const [, formAction, pending] = useTransition(action);
  return (
    <form action={formAction} aria-label="Bericht zurückziehen">
      <SeenFields seen={seen} />
      <ConfirmSubmit
        label="Zurückziehen"
        title="Bericht zurückziehen?"
        message={<p>Der Bericht wird wieder zum Entwurf, Sie können ihn bearbeiten und erneut einreichen.</p>}
        variant="secondary"
        name="action"
        value="WITHDRAW"
        disabled={pending}
        pending={pending}
        pendingLabel="Wird zurückgezogen …"
      />
    </form>
  );
}

/** Freigabe zurücknehmen (AK-703): nur mit Begründung im Dialog, danach „Abgelehnt“. */
export function RevokeForm({ action, seen }: { action: Action; seen: Seen }) {
  const [state, formAction, pending] = useTransition(action);
  return (
    <form action={formAction} aria-label="Freigabe zurücknehmen" noValidate>
      <SeenFields seen={seen} />
      <ConfirmWithReason
        label="Freigabe zurücknehmen"
        title="Freigabe zurücknehmen?"
        message={
          <p>
            Der Bericht wird „Abgelehnt“ und für den Azubi wieder bearbeitbar. Die Begründung steht in der Historie.
          </p>
        }
        fieldLabel="Begründung für die Rücknahme"
        fieldName="reason"
        requiredMessage={TRANSITION_MESSAGES.reasonRequired}
        name="action"
        value="REVOKE_APPROVAL"
        disabled={pending}
        pending={pending}
        pendingLabel="Wird zurückgenommen …"
        serverError={state && !state.ok ? state.fieldErrors?.reason : undefined}
      />
    </form>
  );
}
