"use client";

import { useId, useState } from "react";
import { RANGE_MESSAGES } from "@/domain/report-pdf";
import { inputClass, secondaryButtonClass } from "@/components/ui";

/**
 * Download einer Woche als PDF (AK-901). Ein normaler Link mit `download`: Der Server erzeugt das
 * PDF bei jedem Aufruf neu und prüft den Zugriff selbst (AK-906).
 */
export function PdfDownloadLink({ href, label = "Als PDF herunterladen" }: { href: string; label?: string }) {
  return (
    <a href={href} download className={secondaryButtonClass} data-testid="pdf-download">
      {label}
    </a>
  );
}

/**
 * Sammel-PDF für einen Zeitraum (AK-902): Von/Bis, vorbelegt mit Ausbildungsbeginn bis heute.
 * Aufklappbar über der Wochenliste, damit es auch bei vielen Wochen ohne Scrollen erreichbar ist.
 * Ein GET-Formular, das ohne JavaScript funktioniert; vorab wird nur geprüft, dass „Bis“ nicht vor
 * „Von“ liegt (der Server prüft das ebenfalls).
 */
export function PdfRangeForm({ action, from, to }: { action: string; from: string; to: string }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer p-3 font-medium text-blue-800">Berichtsheft als PDF herunterladen</summary>
      <form
        method="get"
        action={action}
        aria-label="Berichtsheft als PDF"
        className="space-y-3 border-t border-slate-200 p-3"
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
          }
        }}
      >
        <p className="text-sm text-slate-600">
          Alle Wochen des Zeitraums, jede auf einer neuen Seite. Freigegebene Wochen tragen den Freigabevermerk.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <label htmlFor={`${id}-von`} className="block text-sm font-medium text-slate-800">
              Von
            </label>
            <input
              id={`${id}-von`}
              name="von"
              type="date"
              required
              defaultValue={from}
              className={inputClass}
              aria-invalid={error === RANGE_MESSAGES.invalidFrom || undefined}
              aria-describedby={error === RANGE_MESSAGES.invalidFrom ? `${id}-error` : undefined}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor={`${id}-bis`} className="block text-sm font-medium text-slate-800">
              Bis
            </label>
            <input
              id={`${id}-bis`}
              name="bis"
              type="date"
              required
              defaultValue={to}
              className={inputClass}
              aria-invalid={error !== null && error !== RANGE_MESSAGES.invalidFrom ? true : undefined}
              aria-describedby={error !== null && error !== RANGE_MESSAGES.invalidFrom ? `${id}-error` : undefined}
            />
          </div>
        </div>
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button type="submit" className={secondaryButtonClass}>
          Zeitraum als PDF herunterladen
        </button>
      </form>
    </details>
  );
}
