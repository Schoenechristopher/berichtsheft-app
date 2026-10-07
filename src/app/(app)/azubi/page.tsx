import type { Metadata } from "next";
import { now } from "@/domain/clock";
import { currentIsoWeek } from "@/domain/report-generation";
import { PdfRangeForm } from "@/components/PdfExport";
import { WeekOverview } from "@/components/WeekOverview";
import { toDateInput } from "@/domain/weeks";
import { db } from "@/lib/db";
import { exportRangeDefaults } from "@/lib/report-export";
import { ensureReportsForTrainee, listTraineeWeeks } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Meine Wochenberichte" };

/**
 * Startseite für Azubis: Übersicht aller eigenen Wochen (AK-306). Beim Öffnen entstehen fehlende
 * Wochenberichte (AK-301, AK-302); zusätzlich legt der Worker sie täglich an.
 */
export default async function TraineeHomePage() {
  const person = await requirePerson("TRAINEE");
  const instant = now();
  await ensureReportsForTrainee(db(), person.id, instant);
  const overview = await listTraineeWeeks(db(), person, person.id, instant);
  const range = exportRangeDefaults(person, instant);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <h2 className="text-lg font-semibold">Meine Wochenberichte</h2>
      {range ? (
        <PdfRangeForm action={`/azubis/${person.id}/pdf`} from={toDateInput(range.from)} to={toDateInput(range.to)} />
      ) : null}
      <WeekOverview reports={overview?.reports ?? []} currentWeek={currentIsoWeek(instant)} />
    </section>
  );
}
