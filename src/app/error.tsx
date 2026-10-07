"use client";

import { AuthCard } from "@/components/AuthCard";
import { secondaryButtonClass } from "@/components/ui";

/**
 * Unerwarteter Fehler beim Erzeugen einer Seite: deutscher Hinweis statt der englischen
 * Standardmeldung von Next.js. Details stehen nur im Server-Log.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AuthCard title="Etwas ist schiefgelaufen">
      <p role="alert" className="text-sm text-slate-600">
        Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut; bleibt der Fehler, wenden Sie sich an
        Ihren Ausbilder.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className={secondaryButtonClass}>
          Erneut versuchen
        </button>
        {/* Bewusst ein normaler Link: lädt die Startseite vollständig neu. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={secondaryButtonClass}>
          Zur Startseite
        </a>
      </div>
    </AuthCard>
  );
}
