import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { now } from "@/domain/clock";
import { currentIsoWeek } from "@/domain/report-generation";
import { firstLine } from "@/domain/week-progress";
import { compareWeeks, weekRangeLabel, weekRangeShort } from "@/domain/weeks";
import {
  Card,
  DataList,
  DataRow,
  EmptyState,
  RowLink,
  Skeleton,
  SkeletonGroup,
  StatusChip,
  WeekTile,
} from "@/components/ui";
import { db } from "@/lib/db";
import { trainingPeriod } from "@/lib/people/labels";
import { ensureReportsForTrainee, listTraineeWeeks, rejectionTexts } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Start" };

type Person = Awaited<ReturnType<typeof requirePerson>>;

/**
 * Start Azubi (UI-Spezifikation „Start Azubi“, UI-AK-04, UI-AK-05): Begrüßung, aktuelle Woche als
 * große Karte mit Fortschritt und genau einem Knopf, darunter „Zu erledigen“ (offene Wochen vor
 * der aktuellen, abgelehnte oben, sonst älteste zuerst) und „Zuletzt“. Beim Öffnen entstehen
 * fehlende Wochenberichte (AK-301, AK-302); zusätzlich legt der Worker sie täglich an.
 */
export default async function TraineeHomePage() {
  const person = await requirePerson("TRAINEE");
  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}</h1>
        <p className="text-fg-muted">Ausbildung {trainingPeriod(person.trainingStart, person.trainingEnd)}</p>
      </div>
      <Suspense fallback={<StartSkeleton />}>
        <StartContent person={person} />
      </Suspense>
    </div>
  );
}

function StartSkeleton() {
  return (
    <SkeletonGroup label="Wochen werden geladen">
      <Card className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-56" />
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-9 w-9" />
          ))}
        </div>
        <Skeleton className="h-4 w-48" />
      </Card>
      <Skeleton className="h-6 w-32" />
      <Card className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </Card>
    </SkeletonGroup>
  );
}

async function StartContent({ person }: { person: Person }) {
  const instant = now();
  await ensureReportsForTrainee(db(), person.id, instant);
  const overview = await listTraineeWeeks(db(), person, person.id, instant);
  const reports = overview?.reports ?? [];
  const current = currentIsoWeek(instant);
  const thisWeek = reports.find((report) => compareWeeks(report, current) === 0);
  // Zu erledigen: offene Wochen vor der aktuellen; abgelehnte oben, sonst älteste zuerst.
  const todo = reports
    .filter((report) => report.pastOpen)
    .sort((a, b) =>
      a.status === b.status ? compareWeeks(a, b) : a.status === "REJECTED" ? -1 : b.status === "REJECTED" ? 1 : 0,
    );
  const notes = await rejectionTexts(
    db(),
    todo.filter((report) => report.status === "REJECTED").map((report) => report.id),
  );
  const recent = reports.filter((report) => report.status === "SUBMITTED" || report.status === "APPROVED").slice(0, 5);
  const RECENT_GRID = "md:grid-cols-[minmax(8rem,12rem)_1fr_auto]";

  return (
    <>
      <section aria-labelledby="diese-woche">
        <h2 id="diese-woche" className="sr-only">
          Diese Woche
        </h2>
        {thisWeek ? (
          <WeekTile
            large
            headingLevel={3}
            testId="current-week"
            eyebrow="Diese Woche"
            title={`KW ${thisWeek.isoWeek}/${thisWeek.isoYear}`}
            range={weekRangeShort(thisWeek.isoYear, thisWeek.isoWeek)}
            status={thisWeek.status}
            progress={thisWeek.progress}
            href={`/berichte/${thisWeek.id}`}
            actionLabel={
              thisWeek.status === "SUBMITTED" || thisWeek.status === "APPROVED" ? "Ansehen" : "Weiter erfassen"
            }
          />
        ) : (
          <Card>
            <p className="text-fg-muted">
              Für diese Woche gibt es keinen Bericht – sie liegt außerhalb der Ausbildung.
            </p>
          </Card>
        )}
      </section>

      <section aria-labelledby="zu-erledigen" className="space-y-3">
        <h2 id="zu-erledigen" className="text-lg font-semibold">
          Zu erledigen
        </h2>
        {todo.length === 0 ? (
          <EmptyState done testId="todo-empty">
            Alles erledigt – keine offenen Wochen.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Offene Wochen" data-testid="todo-list">
            {todo.map((report) => {
              const note = notes.get(report.id);
              return (
                <li key={report.id} data-testid="todo-week">
                  <WeekTile
                    headingLevel={3}
                    title={`KW ${report.isoWeek}/${report.isoYear}`}
                    range={weekRangeShort(report.isoYear, report.isoWeek)}
                    status={report.status}
                    overdue={report.status === "DRAFT"}
                    progress={report.progress}
                    href={`/berichte/${report.id}`}
                    actionLabel={report.status === "REJECTED" ? "Überarbeiten" : "Weiter erfassen"}
                    actionVariant="secondary"
                    note={
                      note ? (
                        <p className="text-fg-muted">
                          <span className="sr-only">Gesamtkommentar: </span>„{firstLine(note)}“
                        </p>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="zuletzt" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="zuletzt" className="text-lg font-semibold">
            Zuletzt
          </h2>
          <Link
            href="/azubi/wochen"
            className="text-accent inline-flex min-h-11 items-center font-medium hover:underline lg:min-h-8"
          >
            Alle Wochen anzeigen
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState>
            Noch keine eingereichten Wochen. Eingereichte und freigegebene Wochen erscheinen hier.
          </EmptyState>
        ) : (
          <DataList
            label="Zuletzt eingereicht"
            grid={RECENT_GRID}
            columns={[
              { label: "KW", sort: "desc" },
              { label: "Zeitraum" },
              { label: "Status", className: "md:text-right" },
            ]}
          >
            {recent.map((report) => (
              <DataRow key={report.id} grid={RECENT_GRID} data-testid="recent-week">
                <RowLink href={`/berichte/${report.id}`} className="tabular-nums">
                  KW {report.isoWeek}/{report.isoYear}
                </RowLink>
                <span className="text-fg-muted text-sm tabular-nums">
                  {weekRangeLabel(report.isoYear, report.isoWeek)}
                </span>
                <span className="md:text-right">
                  <StatusChip status={report.status} />
                </span>
              </DataRow>
            ))}
          </DataList>
        )}
      </section>
    </>
  );
}
