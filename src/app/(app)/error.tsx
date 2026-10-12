"use client";

import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";

/**
 * Fehlerzustand im Rahmen der App (UI-Spezifikation „Zustände“): „Die Daten konnten nicht geladen
 * werden.“ mit „Erneut versuchen“. Details stehen nur im Server-Log.
 */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1120px] space-y-4">
      <h1 className="text-2xl font-semibold">Etwas ist schiefgelaufen</h1>
      <div
        role="alert"
        className="border-danger bg-rejected-bg text-rejected flex items-start gap-3 rounded-md border p-4"
      >
        <AlertIcon className="mt-0.5 h-5 w-5" />
        <p>Die Daten konnten nicht geladen werden.</p>
      </div>
      <Button variant="primary" onClick={reset}>
        Erneut versuchen
      </Button>
    </div>
  );
}
