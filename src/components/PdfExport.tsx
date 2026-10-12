"use client";

import { useId, useRef, useState } from "react";
import { RANGE_MESSAGES } from "@/domain/report-pdf";
import { Button, buttonClass } from "@/components/ui/button";
import { FieldError, inputClass } from "@/components/ui/field";
import { DownloadIcon } from "@/components/ui/icons";

/**
 * Download einer Woche als PDF (AK-901). Ein normaler Link mit `download`: Der Server erzeugt das
 * PDF bei jedem Aufruf neu und prüft den Zugriff selbst (AK-906).
 */
export function PdfDownloadLink({ href, label = "Als PDF herunterladen" }: { href: string; label?: string }) {
  return (
    <a href={href} download className={buttonClass("secondary")} data-testid="pdf-download">
      <DownloadIcon className="h-4 w-4" />
      {label}
    </a>
  );
}

/**
 * Sammel-PDF für einen Zeitraum (AK-902) rechts im Seitentitel: Knopf mit Dialog „Von/Bis“,
 * vorbelegt mit Ausbildungsbeginn bis heute. Ein GET-Formular; vorab wird nur geprüft, dass „Bis“
 * nicht vor „Von“ liegt (der Server prüft das ebenfalls). Der Dialog fängt den Fokus, Escape
 * bricht ab (UI-AK-18).
 */
export function PdfRangeForm({ action, from, to }: { action: string; from: string; to: string }) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const fromInvalid = error === RANGE_MESSAGES.invalidFrom;
  const toInvalid = error !== null && !fromInvalid;
  return (
    <>
      <Button ref={buttonRef} variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        <DownloadIcon className="h-4 w-4" />
        Berichtsheft als PDF herunterladen
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClose={() => buttonRef.current?.focus()}
        onKeyDown={(event) => trapFocus(event, dialogRef.current)}
        className="rounded-card border-border bg-surface text-fg backdrop:bg-backdrop m-auto w-[calc(100%-2rem)] max-w-md border p-0 shadow-xl"
      >
        <form
          method="get"
          action={action}
          aria-label="Berichtsheft als PDF"
          className="space-y-4 p-5"
          onSubmit={(event) => {
            const data = new FormData(event.currentTarget);
            const fromValue = String(data.get("von") ?? "");
            const toValue = String(data.get("bis") ?? "");
            const message = !fromValue
              ? RANGE_MESSAGES.invalidFrom
              : !toValue
                ? RANGE_MESSAGES.invalidTo
                : toValue < fromValue
                  ? RANGE_MESSAGES.order
                  : null;
            setError(message);
            if (message) {
              event.preventDefault();
            } else {
              dialogRef.current?.close();
            }
          }}
        >
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            Welchen Zeitraum exportieren?
          </h2>
          <p className="text-fg-muted">
            Alle Wochen des Zeitraums, jede auf einer neuen Seite. Freigegebene Wochen tragen den Freigabevermerk.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor={`${id}-von`} className="block text-sm font-medium">
                Von
              </label>
              <input
                id={`${id}-von`}
                name="von"
                type="date"
                required
                defaultValue={from}
                className={inputClass}
                aria-invalid={fromInvalid || undefined}
                aria-describedby={fromInvalid ? `${id}-error` : undefined}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor={`${id}-bis`} className="block text-sm font-medium">
                Bis
              </label>
              <input
                id={`${id}-bis`}
                name="bis"
                type="date"
                required
                defaultValue={to}
                className={inputClass}
                aria-invalid={toInvalid || undefined}
                aria-describedby={toInvalid ? `${id}-error` : undefined}
              />
            </div>
          </div>
          {error ? (
            <div role="alert">
              <FieldError id={`${id}-error`}>{error}</FieldError>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary">
              Zeitraum als PDF herunterladen
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Tab und Umschalt+Tab bleiben im Dialog. */
function trapFocus(event: React.KeyboardEvent, dialog: HTMLDialogElement | null) {
  if (event.key !== "Tab" || !dialog) {
    return;
  }
  const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])")];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
