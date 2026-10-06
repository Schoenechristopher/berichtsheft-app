import { requirePerson } from "@/lib/session";

/** Startseite für Ausbilder (Platzhalter bis Etappe 2 und 4). */
export default async function TrainerHomePage() {
  const person = await requirePerson("TRAINER");

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <p className="text-slate-600">Startseite für Ausbilder.</p>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        Hier erscheinen ab Etappe 2 die Nutzerverwaltung und ab Etappe 4 die Prüfliste.
      </div>
    </section>
  );
}
