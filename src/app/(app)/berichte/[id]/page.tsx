import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACCESS_DENIED_MESSAGE, canEditReport, canViewReport, reportStatusLabel } from "@/domain/report-access";
import { DAY_TYPE_LABELS } from "@/domain/report-days";
import { currentApproval, currentFeedback, formatDateTime, groupHistory } from "@/domain/report-history";
import { availableActions } from "@/domain/report-status";
import { formatDate, toDateInput, weekLabel, weekdayLong } from "@/domain/weeks";
import { BackLink, Badge } from "@/components/ui";
import { ReportHistory } from "@/components/ReportHistory";
import { PdfDownloadLink } from "@/components/PdfExport";
import { STATUS_TONES } from "@/components/WeekOverview";
import { homePathFor } from "@/domain/access";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { loadReportHistory } from "@/lib/reports";
import { requirePerson } from "@/lib/session";
import { saveReportAction, transitionAction } from "./actions";
import { ReportEditor } from "./ReportEditor";
import { ReviewForm, RevokeForm, WithdrawForm } from "./ReviewForms";

export const metadata: Metadata = { title: "Wochenbericht" };

/**
 * Bericht ansehen, erfassen, einreichen und prüfen. Azubis sehen nur eigene Berichte, fremde ergeben
 * „Zugriff verweigert“ (AK-103); Ausbilder sehen alle (AK-105). Welche Aktionen angeboten werden,
 * entscheidet das Statusmodell (`availableActions`); der Server prüft jede Aktion erneut.
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

  const { changes, comments } = await loadReportHistory(db(), report.id);
  const forAccess = { ...report, traineeActive: report.trainee.active };
  const editable = canEditReport(viewer, forAccess);
  const actions = availableActions(viewer, forAccess);
  const approval = currentApproval(report.status, changes);
  const feedback = currentFeedback(report.status, changes, comments);
  const dayComments = Object.fromEntries(feedback?.dayComments ?? []);
  const seen = { status: report.status, version: report.version };
  const transition = transitionAction.bind(null, report.id);
  const overviewPath = viewer.role === "TRAINER" ? `/ausbilder/azubis/${report.traineeId}` : homePathFor(viewer.role);
  const dayLabel = (date: Date) => `${weekdayLong(date)}, ${formatDate(date)}`;
  const dayTypeLabel = (day: (typeof report.days)[number]) =>
    day.outsideTraining
      ? "außerhalb der Ausbildung"
      : day.dayType
        ? DAY_TYPE_LABELS[day.dayType]
        : "Tagesart noch offen";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <BackLink href={overviewPath}>Zur Übersicht</BackLink>
        {viewer.role === "TRAINER" ? <BackLink href="/ausbilder/pruefliste">Zur Prüfliste</BackLink> : null}
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{weekLabel(report.isoYear, report.isoWeek)}</h1>
        <p className="text-slate-700" data-testid="report-trainee">
          {report.trainee.name}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={STATUS_TONES[report.status]}>
            <span data-testid="report-status">Status: {reportStatusLabel(report.status)}</span>
          </Badge>
          {report.trainee.active ? null : <Badge tone="slate">Azubi deaktiviert</Badge>}
        </div>
        {approval ? (
          <p className="text-sm text-green-800" data-testid="approval-note">
            Freigegeben von {approval.actorName} am {formatDateTime(approval.at)}
          </p>
        ) : null}
        <div className="pt-1">
          <PdfDownloadLink href={`/berichte/${report.id}/pdf`} />
        </div>
      </div>

      {feedback ? (
        <div role="note" data-testid="review-feedback" className="space-y-1 rounded-md bg-amber-50 p-3 text-amber-950">
          <p className="text-sm font-medium">
            {feedback.kind === "REVOKED"
              ? `Freigabe zurückgenommen von ${feedback.actorName} am ${formatDateTime(feedback.at)}`
              : `Abgelehnt von ${feedback.actorName} am ${formatDateTime(feedback.at)}`}
          </p>
          <p className="text-sm break-words whitespace-pre-wrap" data-testid="review-feedback-text">
            {feedback.kind === "REVOKED" ? "Begründung: " : "Gesamtkommentar: "}
            {feedback.text}
          </p>
        </div>
      ) : null}

      {editable ? (
        <ReportEditor
          action={saveReportAction.bind(null, report.id)}
          submit={
            actions.includes("SUBMIT")
              ? { action: "SUBMIT", ...seen }
              : actions.includes("RESUBMIT")
                ? { action: "RESUBMIT", ...seen }
                : undefined
          }
          dayComments={dayComments}
          days={report.days.map((day) => ({
            id: day.id,
            date: toDateInput(day.date),
            label: dayLabel(day.date),
            outsideTraining: day.outsideTraining,
            dayType: day.dayType ?? "",
            activities: day.activities,
          }))}
        />
      ) : actions.includes("APPROVE") ? (
        <ReviewForm
          action={transition}
          seen={seen}
          canReject={actions.includes("REJECT")}
          days={report.days.map((day) => ({
            id: day.id,
            label: dayLabel(day.date),
            outsideTraining: day.outsideTraining,
            dayTypeLabel: dayTypeLabel(day),
            activities: day.activities,
          }))}
        />
      ) : (
        <>
          <p className="text-sm text-slate-600" data-testid="report-editable">
            {!report.trainee.active
              ? "Nicht änderbar: Die Person ist deaktiviert. Der Bericht bleibt lesbar."
              : viewer.role === "TRAINEE" && report.status === "SUBMITTED"
                ? "Eingereicht – schreibgeschützt. Zum Bearbeiten den Bericht zurückziehen."
                : report.status === "APPROVED"
                  ? "Freigegeben – nicht mehr änderbar."
                  : "Nur lesend."}
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
                  <span className="text-sm">{dayTypeLabel(day)}</span>
                </div>
                {day.activities ? (
                  <p className="mt-1 text-sm break-words whitespace-pre-wrap">{day.activities}</p>
                ) : null}
                {(dayComments[day.id] ?? []).map((comment, index) => (
                  <p
                    key={index}
                    data-testid="day-comment"
                    className="mt-2 rounded-md bg-amber-50 p-2 text-sm break-words whitespace-pre-wrap text-amber-900"
                  >
                    <span className="font-medium">Kommentar des Ausbilders: </span>
                    {comment}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {actions.includes("WITHDRAW") ? <WithdrawForm action={transition} seen={seen} /> : null}
          {actions.includes("REVOKE_APPROVAL") ? <RevokeForm action={transition} seen={seen} /> : null}
        </>
      )}

      <ReportHistory rounds={groupHistory(changes, comments)} />
    </section>
  );
}
