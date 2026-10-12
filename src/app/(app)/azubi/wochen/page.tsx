import type { Metadata } from "next";
import { Suspense } from "react";
import { now } from "@/domain/clock";
import { currentIsoWeek } from "@/domain/weeks";
import { toDateInput } from "@/domain/weeks";
import { ListSkeleton, PageHeader } from "@/components/ui";
import { PdfRangeForm } from "@/components/PdfExport";
import { WeekOverview, parseWeekFilter } from "@/components/WeekOverview";
import { db } from "@/lib/db";
import { exportRangeDefaults } from "@/lib/report-export";
import { ensureReportsForTrainee, listTraineeWeeks } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Meine Wochen" };

/**
 * Meine Wochen (UI-Spezifikation): vollständige Liste aller eigenen Wochen (AK-306) mit Filter
 * „Alle / Offen / Eingereicht / Freigegeben“ und dem Sammel-PDF rechts im Seitentitel (AK-902).
 */
export default async function TraineeWeeksPage({ searchParams }: PageProps<"/azubi/wochen">) {
  const person = await requirePerson("TRAINEE");
  const filter = parseWeekFilter((await searchParams).status);
  const range = exportRangeDefaults(person, now());

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader
        title="Meine Wochen"
        actions={
          range ? (
            <PdfRangeForm
              action={`/azubis/${person.id}/pdf`}
              from={toDateInput(range.from)}
              to={toDateInput(range.to)}
            />
          ) : null
        }
      />
      <Suspense fallback={<ListSkeleton label="Wochen werden geladen" />}>
        <Weeks person={person} filter={filter} />
      </Suspense>
    </div>
  );
}

async function Weeks({
  person,
  filter,
}: {
  person: Awaited<ReturnType<typeof requirePerson>>;
  filter: ReturnType<typeof parseWeekFilter>;
}) {
  const instant = now();
  await ensureReportsForTrainee(db(), person.id, instant);
  const overview = await listTraineeWeeks(db(), person, person.id, instant);
  return (
    <WeekOverview
      reports={overview?.reports ?? []}
      currentWeek={currentIsoWeek(instant)}
      filter={filter}
      basePath="/azubi/wochen"
    />
  );
}
