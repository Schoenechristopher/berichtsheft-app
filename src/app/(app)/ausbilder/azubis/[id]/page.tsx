import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { now } from "@/domain/clock";
import { currentIsoWeek } from "@/domain/weeks";
import { toDateInput } from "@/domain/weeks";
import { Badge, PageHeader } from "@/components/ui";
import { PdfRangeForm } from "@/components/PdfExport";
import { WeekOverview, parseWeekFilter } from "@/components/WeekOverview";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { trainingPeriod } from "@/lib/people/labels";
import { exportRangeDefaults } from "@/lib/report-export";
import { ensureReportsForTrainee, listTraineeWeeks } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Wochenberichte eines Azubis" };

/**
 * Wochen eines Azubis für Ausbilder (AK-105, AK-306): Meine Wochen aus Ausbildersicht, nur lesend,
 * mit Filter und Sammel-PDF.
 */
export default async function TraineeWeeksPage({ params, searchParams }: PageProps<"/ausbilder/azubis/[id]">) {
  const viewer = await requirePerson("TRAINER");
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const instant = now();
  await ensureReportsForTrainee(db(), id, instant);
  const overview = await listTraineeWeeks(db(), viewer, id, instant);
  if (!overview) {
    notFound();
  }
  const { trainee, reports } = overview;
  const range = exportRangeDefaults(trainee, instant);
  const filter = parseWeekFilter((await searchParams).status);

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader
        back={{ href: "/ausbilder/azubis", label: "Zurück zu Azubis" }}
        title={`Wochenberichte von ${trainee.name}`}
        subtitle={`Ausbildung ${trainingPeriod(trainee.trainingStart, trainee.trainingEnd)}`}
        meta={trainee.active ? null : <Badge>deaktiviert</Badge>}
        actions={
          range ? (
            <PdfRangeForm
              action={`/azubis/${trainee.id}/pdf`}
              from={toDateInput(range.from)}
              to={toDateInput(range.to)}
            />
          ) : null
        }
      />
      <WeekOverview
        reports={reports}
        currentWeek={currentIsoWeek(instant)}
        filter={filter}
        basePath={`/ausbilder/azubis/${trainee.id}`}
      />
    </div>
  );
}
