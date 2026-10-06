import { notFound } from "next/navigation";
import { ACCESS_DENIED_MESSAGE, canEditReport, canViewReport, reportStatusLabel } from "@/domain/report-access";
import { DAY_TYPE_LABELS } from "@/domain/report-days";
import { formatDate, weekLabel, weekdayLong } from "@/domain/weeks";
import { BackLink, Badge } from "@/components/ui";
import { homePathFor } from "@/domain/access";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { requirePerson } from "@/lib/session";
import { saveReportAction } from "./actions";
import { ReportEditor } from "./ReportEditor";

/**
 * Bericht ansehen und erfassen. Azubis sehen nur eigene Berichte, fremde ergeben „Zugriff
 * verweigert“ (AK-103); Ausbilder sehen alle, nur lesend (AK-105). Bearbeiten darf nur der eigene,
 * aktive Azubi in „Entwurf“ oder „Abgelehnt“ (AK-401 – AK-408, AK-204).
 */
export default async function ReportPage({ params }: PageProps<"/berichte/[id]">) {
  const viewer = await requirePerson();
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const report = await db().weeklyReport.findUnique({
    where: { id },
    include: { trainee: { select: { name: true, active: true } }, days: { orderBy: { date: "asc" } } },
  });
  if (!report) {
    notFound();
  }

  if (!canViewReport(viewer, report)) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{ACCESS_DENIED_MESSAGE}</h1>
        <p className="text-slate-600">Sie können nur Ihre eigenen Berichte ansehen.</p>
        <BackLink href={homePathFor(viewer.role)}>Zur Startseite</BackLink>
      </section>
    );
  }

  const editable = canEditReport(viewer, { ...report, traineeActive: report.trainee.active });
  const overviewPath = viewer.role === "TRAINER" ? `/ausbilder/azubis/${report.traineeId}` : homePathFor(viewer.role);
  const dayLabel = (date: Date) => `${weekdayLong(date)}, ${formatDate(date)}`;

  return (
    <section className="space-y-4">
      <BackLink href={overviewPath}>Zur Übersicht</BackLink>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{weekLabel(report.isoYear, report.isoWeek)}</h1>
        <p className="text-slate-700" data-testid="report-trainee">
          {report.trainee.name}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">Status: {reportStatusLabel(report.status)}</Badge>
          {report.trainee.active ? null : <Badge tone="slate">Azubi deaktiviert</Badge>}
        </div>
      </div>
      {editable ? (
        <ReportEditor
          action={saveReportAction.bind(null, report.id)}
          days={report.days.map((day) => ({
            id: day.id,
            label: dayLabel(day.date),
            outsideTraining: day.outsideTraining,
            dayType: day.dayType ?? "",
            activities: day.activities,
          }))}
        />
      ) : (
        <>
          <p className="text-sm text-slate-600" data-testid="report-editable">
            {report.trainee.active
              ? "Nur lesend."
              : "Nicht änderbar: Die Person ist deaktiviert. Der Bericht bleibt lesbar."}
          </p>
          <ul className="space-y-2" aria-label="Tage">
            {report.days.map((day) => (
              <li
                key={day.id}
                data-testid="report-day"
                className={`rounded-lg border border-slate-200 p-3 ${day.outsideTraining ? "bg-slate-100 text-slate-500" : "bg-white"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{dayLabel(day.date)}</span>
                  <span className="text-sm">
                    {day.outsideTraining
                      ? "außerhalb der Ausbildung"
                      : day.dayType
                        ? DAY_TYPE_LABELS[day.dayType]
                        : "Tagesart noch offen"}
                  </span>
                </div>
                {day.activities ? (
                  <p className="mt-1 text-sm break-words whitespace-pre-wrap">{day.activities}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
