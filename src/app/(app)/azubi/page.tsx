import { now } from "@/domain/clock";
import { currentIsoWeek } from "@/domain/report-generation";
import { WeekOverview } from "@/components/WeekOverview";
import { db } from "@/lib/db";
import { ensureReportsForTrainee, listTraineeWeeks } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/**
 * Startseite für Azubis: Übersicht aller eigenen Wochen (AK-306). Beim Öffnen entstehen fehlende
 * Wochenberichte (AK-301, AK-302); zusätzlich legt der Worker sie täglich an.
 */
export default async function TraineeHomePage() {
  const person = await requirePerson("TRAINEE");
  const instant = now();
  await ensureReportsForTrainee(db(), person.id, instant);
  const overview = await listTraineeWeeks(db(), person, person.id, instant);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <h2 className="text-lg font-semibold">Meine Wochenberichte</h2>
      <WeekOverview reports={overview?.reports ?? []} currentWeek={currentIsoWeek(instant)} />
    </section>
  );
}
