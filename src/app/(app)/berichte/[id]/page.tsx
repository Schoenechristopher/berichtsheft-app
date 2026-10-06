import { notFound } from "next/navigation";
import { ACCESS_DENIED_MESSAGE, canEditReport, canViewReport, reportStatusLabel } from "@/domain/report-access";
import { formatDate, weekLabel, weekdayShort } from "@/domain/weeks";
import { BackLink, Badge } from "@/components/ui";
import { homePathFor } from "@/domain/access";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { requirePerson } from "@/lib/session";

const DAY_TYPE_LABELS = {
  WORK: "Betrieb",
  SCHOOL: "Berufsschule",
  VACATION: "Urlaub",
  SICK: "Krank",
  HOLIDAY: "Feiertag",
} as const;

/**
 * Berichtsansicht, nur lesend (Platzhalter bis Etappe 3). Azubis sehen nur eigene Berichte,
 * fremde ergeben „Zugriff verweigert“ (AK-103); Ausbilder sehen alle (AK-105).
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

  return (
    <section className="space-y-4">
      <BackLink href={homePathFor(viewer.role)}>Zur Startseite</BackLink>
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
      <p className="text-sm text-slate-600" data-testid="report-editable">
        {editable
          ? "Bearbeitbar (die Bearbeitung folgt in Etappe 3)."
          : report.trainee.active
            ? "Nur lesend."
            : "Nicht änderbar: Die Person ist deaktiviert. Der Bericht bleibt lesbar."}
      </p>

      <ul className="space-y-2">
        {report.days.map((day) => (
          <li key={day.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                {weekdayShort(day.date)} {formatDate(day.date)}
              </span>
              <span className="text-sm text-slate-600">
                {day.outsideTraining
                  ? "außerhalb der Ausbildung"
                  : day.dayType
                    ? DAY_TYPE_LABELS[day.dayType]
                    : "Tagesart noch offen"}
              </span>
            </div>
            {day.activities ? (
              <p className="mt-1 text-sm break-words whitespace-pre-wrap text-slate-800">{day.activities}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
