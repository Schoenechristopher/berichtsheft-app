import { requirePerson } from "@/lib/session";

/** Startseite für Azubis (Platzhalter bis Etappe 3). */
export default async function TraineeHomePage() {
  const person = await requirePerson("TRAINEE");

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <p className="text-slate-600">Startseite für Azubis.</p>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        Hier erscheinen ab Etappe 3 deine Wochenberichte mit Status.
      </div>
    </section>
  );
}
