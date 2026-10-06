/** Gemeinsame Bausteine der Oberfläche, mobil zuerst (375 px). */
import Link from "next/link";

export const inputClass =
  "block w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none aria-[invalid=true]:border-red-600";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2.5 font-medium text-white hover:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-md bg-red-700 px-4 py-2.5 font-medium text-white hover:bg-red-800 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60";

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
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Erfolgs- oder Fehlermeldung über dem Inhalt. */
export function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: React.ReactNode }) {
  const styles = {
    success: "bg-green-50 text-green-800",
    error: "bg-red-50 text-red-800",
    info: "bg-slate-100 text-slate-700",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-md p-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

/** Kleines Etikett, z. B. für Rolle oder Status. */
export function Badge({ tone, children }: { tone: "green" | "slate" | "amber" | "blue"; children: React.ReactNode }) {
  const styles = {
    green: "bg-green-100 text-green-800",
    slate: "bg-slate-200 text-slate-700",
    amber: "bg-amber-100 text-amber-900",
    blue: "bg-blue-100 text-blue-800",
  }[tone];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-blue-700 underline">
      ← {children}
    </Link>
  );
}
