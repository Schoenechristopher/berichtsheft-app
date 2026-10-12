"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isBlank } from "@/domain/report-status";
import { Button, Ellipsis, type ButtonVariant } from "./button";
import { Field, inputClass } from "./field";

/**
 * Dialog (UI-Spezifikation): modal, Titel als Frage, Folge in einem Satz, Knopf mit Verb. Fängt
 * den Fokus (Tab und Umschalt+Tab bleiben im Dialog), Escape bricht ab, danach steht der Fokus
 * wieder auf dem auslösenden Knopf (UI-AK-18). Grundlage ist das native `<dialog>` mit
 * `showModal()`: Der Rest der Seite ist solange inaktiv.
 */
function useFocusTrap(dialogRef: React.RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [dialogRef]);
}

const DIALOG_CLASS =
  "m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-surface p-0 text-fg shadow-xl backdrop:bg-backdrop";

/** Gerüst eines Dialogs: Titel, Text, Fußzeile mit „Abbrechen“ und der Bestätigung. */
function DialogFrame({
  dialogRef,
  titleId,
  title,
  onClose,
  children,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  titleId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useFocusTrap(dialogRef);
  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onClose={onClose} className={DIALOG_CLASS}>
      <div className="space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

/**
 * Knopf mit Bestätigungsdialog (Einreichen, Zurückziehen, Freigeben). Muss in einem Formular
 * stehen: Erst die Bestätigung im Dialog schickt das Formular ab, mit `name`/`value` als Absender
 * (z. B. `action=APPROVE`). `beforeOpen` kann vorher prüfen (Pflichtfelder) und das Öffnen
 * verhindern, indem es `false` liefert. Der Fokus steht zuerst auf „Abbrechen“ (sicherer Standard).
 */
export function ConfirmSubmit({
  label,
  title,
  message,
  confirmLabel = label,
  variant = "primary",
  confirmVariant = variant,
  name,
  value,
  disabled,
  pending,
  pendingLabel,
  beforeOpen,
  className = "",
}: {
  label: string;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  name?: string;
  value?: string;
  disabled?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  beforeOpen?: () => boolean;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  return (
    <>
      <Button
        ref={buttonRef}
        variant={variant}
        disabled={disabled}
        pending={pending}
        pendingLabel={pendingLabel}
        className={className}
        onClick={() => {
          if (!beforeOpen || beforeOpen()) {
            dialogRef.current?.showModal();
          }
        }}
      >
        {label}
        <Ellipsis />
      </Button>
      <DialogFrame dialogRef={dialogRef} titleId={titleId} title={title} onClose={() => buttonRef.current?.focus()}>
        <div className="text-fg">{message}</div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            name={name}
            value={value}
            variant={confirmVariant}
            onClick={() => dialogRef.current?.close()}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogFrame>
    </>
  );
}

/**
 * Knopf mit Dialog „Bestätigen mit Pflichtgrund“ (Ablehnen, Freigabe zurücknehmen). Das
 * Textfeld gehört zum umgebenden Formular (`fieldName`); der Fokus steht zuerst im Feld. Ohne Text
 * erscheint die Meldung am Feld und der Dialog bleibt offen (AK-604, AK-703).
 */
export function ConfirmWithReason({
  label,
  title,
  message,
  fieldLabel,
  fieldName,
  requiredMessage,
  confirmLabel = label,
  name,
  value,
  disabled,
  pending,
  pendingLabel,
  serverError,
  variant = "danger-secondary",
  className = "",
}: {
  label: string;
  title: string;
  message: React.ReactNode;
  fieldLabel: string;
  fieldName: string;
  requiredMessage: string;
  confirmLabel?: string;
  name: string;
  value: string;
  disabled?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  /** Fehler des Servers zum Feld (z. B. zu lang); öffnet den Dialog erneut. */
  serverError?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const fieldId = useId();
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const error = (checked && isBlank(text) ? requiredMessage : undefined) ?? serverError;

  useEffect(() => {
    if (serverError && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [serverError]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant={variant}
        disabled={disabled}
        pending={pending}
        pendingLabel={pendingLabel}
        className={className}
        onClick={() => {
          setChecked(false);
          dialogRef.current?.showModal();
          textRef.current?.focus();
        }}
      >
        {label}
        <Ellipsis />
      </Button>
      <DialogFrame dialogRef={dialogRef} titleId={titleId} title={title} onClose={() => buttonRef.current?.focus()}>
        <div className="text-fg">{message}</div>
        <Field id={fieldId} label={fieldLabel} error={error}>
          <textarea
            ref={textRef}
            id={fieldId}
            name={fieldName}
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={`${inputClass} resize-y`}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            name={name}
            value={value}
            variant="danger"
            onClick={(event) => {
              setChecked(true);
              if (isBlank(text)) {
                event.preventDefault();
                textRef.current?.focus();
                return;
              }
              dialogRef.current?.close();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogFrame>
    </>
  );
}
