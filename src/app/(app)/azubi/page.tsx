import { ReportList } from "@/components/ReportList";
import { db } from "@/lib/db";
import { listVisibleReports } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/** Startseite für Azubis: eigene Berichte (Übersicht mit Wochenerzeugung folgt in Etappe 3). */
export default async function TraineeHomePage() {
  const person = await requirePerson("TRAINEE");
  const reports = await listVisibleReports(db(), person);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <p className="text-slate-600">Startseite für Azubis.</p>
      <h2 className="text-lg font-semibold">Meine Berichte</h2>
      <ReportList reports={reports} showTrainee={false} />
    </section>
  );
}
