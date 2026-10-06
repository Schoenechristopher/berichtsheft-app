"use client";

import { useId, useRef } from "react";
import { secondaryButtonClass } from "@/components/ui";

/**
 * Schaltfläche mit Bestätigungsdialog (Einreichen, Zurückziehen, Freigeben, Ablehnen, Rücknahme).
 * Muss in einem Formular stehen: Erst „Bestätigen“ im Dialog schickt das Formular ab, mit
 * `name`/`value` als Absender (z. B. `action=APPROVE`). `beforeOpen` kann vorher prüfen (Vorschau
 * der Pflichtfelder) und das Öffnen verhindern, indem es `false` liefert.
 */
export function ConfirmSubmit({
  label,
  title,
  message,
  confirmLabel = label,
  buttonClass,
  name,
  value,
  disabled,
  beforeOpen,
}: {
  label: string;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  buttonClass: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  beforeOpen?: () => boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={buttonClass}
        onClick={() => {
          if (!beforeOpen || beforeOpen()) {
            dialogRef.current?.showModal();
          }
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg p-0 shadow-xl backdrop:bg-slate-900/50"
      >
        <div className="space-y-3 p-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <div className="text-sm text-slate-700">{message}</div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" className={secondaryButtonClass} onClick={() => dialogRef.current?.close()}>
              Abbrechen
            </button>
            <button
              type="submit"
              name={name}
              value={value}
              className={buttonClass}
              onClick={() => dialogRef.current?.close()}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
