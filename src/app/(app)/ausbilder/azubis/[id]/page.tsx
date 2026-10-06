import { notFound } from "next/navigation";
import { now } from "@/domain/clock";
import { currentIsoWeek } from "@/domain/report-generation";
import { BackLink, Badge } from "@/components/ui";
import { WeekOverview } from "@/components/WeekOverview";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { trainingPeriod } from "@/lib/people/labels";
import { ensureReportsForTrainee, listTraineeWeeks } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/** Wochenübersicht eines Azubis für Ausbilder (AK-105, AK-306): dieselbe Liste, nur lesend. */
export default async function TraineeWeeksPage({ params }: PageProps<"/ausbilder/azubis/[id]">) {
  const viewer = await requirePerson("TRAINER");
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const instant = now();
  await ensureReportsForTrainee(db(), id, instant);
  const overview = await listTraineeWeeks(db(), viewer, id);
  if (!overview) {
    notFound();
  }
  const { trainee, reports } = overview;

  return (
    <section className="space-y-4">
      <BackLink href="/ausbilder">Zur Startseite</BackLink>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold break-words">Wochenberichte von {trainee.name}</h1>
        <p className="text-sm text-slate-600">
          Ausbildung {trainingPeriod(trainee.trainingStart, trainee.trainingEnd)}
        </p>
        {trainee.active ? null : <Badge tone="slate">deaktiviert</Badge>}
      </div>
      <WeekOverview reports={reports} currentWeek={currentIsoWeek(instant)} />
    </section>
  );
}
