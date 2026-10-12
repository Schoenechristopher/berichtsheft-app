/**
 * Zentrierte Karte auf --bg für Anmelden, „Kein Zugang“ und Fehlerseiten (UI-Spezifikation
 * „Übrige Seiten“): Schriftzug, Titel (einzige h1) und Inhalt; mobil zuerst (375 px).
 */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="inhalt" className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="rounded-card border-border bg-surface w-full max-w-sm border p-6 md:p-8">
        <p className="text-accent text-lg font-semibold">Berichtsheft</p>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </main>
  );
}
