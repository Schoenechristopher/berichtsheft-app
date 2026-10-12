import { AlertIcon } from "./icons";

/**
 * Eingabefelder (UI-Spezifikation, „Textfeld / Textbereich“): Beschriftung immer sichtbar über dem
 * Feld, Fehler unter dem Feld in --danger mit Symbol, Feld mit rotem Rahmen und `aria-invalid`.
 * Schrift mindestens 16 px, damit iOS nicht zoomt.
 */
export const inputClass =
  "block min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-fg placeholder:text-fg-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger lg:min-h-10";

/** Fehlermeldung am Feld. */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-danger flex items-start gap-1.5 text-sm">
      <AlertIcon className="mt-0.5 h-4 w-4" />
      <span>{children}</span>
    </p>
  );
}

/** Formularfeld mit Beschriftung, optionalem Hinweis und Fehlermeldung direkt am Feld. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-fg block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-fg-muted text-sm">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

const numberFormat = new Intl.NumberFormat("de-DE");

/**
 * Zeichenzähler „1.234 / 5.000“: ab 80 % sichtbar, über der Grenze in --danger. Mit `always`
 * immer sichtbar (z. B. „Tätigkeiten“, wo der Zähler zur Spalte gehört).
 */
export function CharacterCount({
  id,
  length,
  max,
  always = false,
  hidden = false,
}: {
  id: string;
  length: number;
  max: number;
  always?: boolean;
  hidden?: boolean;
}) {
  const visible = !hidden && (always || length >= max * 0.8);
  return (
    <p
      id={id}
      hidden={!visible}
      className={`text-xs tabular-nums ${length > max ? "text-danger font-medium" : "text-fg-muted"}`}
    >
      {numberFormat.format(length)} / {numberFormat.format(max)} Zeichen
    </p>
  );
}
