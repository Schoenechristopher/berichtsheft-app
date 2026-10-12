import { canEditReport, canViewReport, type Viewer } from "@/domain/report-access";
import { DAY_TYPE_LABELS } from "@/domain/report-days";
import { currentApproval, currentFeedback, formatDateTime, groupHistory } from "@/domain/report-history";
import { availableActions } from "@/domain/report-status";
import { isPublicHoliday } from "@/domain/holidays";
import { formatDate, toDateInput, weekdayLong, weekRangeLabel } from "@/domain/weeks";
import { Badge, Notice, StatusChip } from "@/components/ui";
import { ReportHistory } from "@/components/ReportHistory";
import { PdfDownloadLink } from "@/components/PdfExport";
import { db } from "@/lib/db";
import { getFederalState } from "@/lib/people/service";
import { loadReportHistory } from "@/lib/reports";
import { saveReportAction, transitionAction } from "./actions";
import { ReportEditor } from "./ReportEditor";
import { ReviewForm, RevokeForm, WithdrawForm } from "./ReviewForms";

/** Bericht mit Tagen und Azubi, wie ihn die Ansicht braucht. */
export async function loadReport(id: string) {
  return db().weeklyReport.findUnique({
    where: { id },
    include: { trainee: { select: { name: true, active: true } }, days: { orderBy: { date: "asc" } } },
  });
}

export type LoadedReport = NonNullable<Awaited<ReturnType<typeof loadReport>>>;

/** Kopf der Woche: Titel „KW 41/2026“ mit Zeitraum, Status-Chip, PDF und Azubi-Name. */
function ReportHeading({ report, level }: { report: LoadedReport; level: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  const range = weekRangeLabel(report.isoYear, report.isoWeek);
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 space-y-2">
        <Heading className="text-2xl font-semibold tabular-nums">
          KW {report.isoWeek}/{report.isoYear}{" "}
          <span className="text-fg-muted text-base font-normal whitespace-nowrap">({range})</span>
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={report.status} prefix="Status: " testId="report-status" />
          <span className="text-fg" data-testid="report-trainee">
            {report.trainee.name}
          </span>
          {report.trainee.active ? null : <Badge>Azubi deaktiviert</Badge>}
        </div>
      </div>
      <PdfDownloadLink href={`/berichte/${report.id}/pdf`} />
    </div>
  );
}

/**
 * Inhalt eines Berichts für die Berichtsseite und die geteilte Prüfansicht: Kopf, Hinweisleiste je
 * Status, Tage (erfassen, prüfen oder nur lesen) und Verlauf. Welche Aktionen angeboten werden,
 * entscheidet das Statusmodell (`availableActions`); der Server prüft jede Aktion erneut.
 * Der Aufrufer prüft vorher `canViewReport`.
 */
export async function ReportView({
  report,
  viewer,
  headingLevel = 1,
  nextHref,
}: {
  report: LoadedReport;
  viewer: Viewer;
  headingLevel?: 1 | 2;
  /** Prüfansicht: nach Freigeben oder Ablehnen weiter zu dieser Adresse (UI-AK-11). */
  nextHref?: string;
}) {
  if (!canViewReport(viewer, report)) {
    throw new Error("ReportView ohne Zugriff aufgerufen");
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
  const submittedAt = [...changes].reverse().find((change) => change.toStatus === "SUBMITTED")?.createdAt;
  const dayLabel = (date: Date) => `${weekdayLong(date)}, ${formatDate(date)}`;
  const dayTypeLabel = (day: LoadedReport["days"][number]) =>
    day.outsideTraining
      ? "außerhalb der Ausbildung"
      : day.dayType
        ? DAY_TYPE_LABELS[day.dayType]
        : "Tagesart noch offen";
  const federalState = editable ? await getFederalState(db()) : null;

  const readOnlyText = !report.trainee.active
    ? "Nicht änderbar: Die Person ist deaktiviert. Der Bericht bleibt lesbar."
    : viewer.role === "TRAINEE" && report.status === "SUBMITTED"
      ? `Eingereicht${submittedAt ? ` am ${formatDateTime(submittedAt)}` : ""} – schreibgeschützt. Zum Bearbeiten den Bericht zurückziehen.`
      : report.status === "APPROVED"
        ? "Freigegeben – nicht mehr änderbar."
        : "Nur lesend.";

  return (
    <div className="space-y-5">
      <ReportHeading report={report} level={headingLevel} />

      {feedback ? (
        <Notice
          tone="warning"
          role="note"
          testId="review-feedback"
          title={
            feedback.kind === "REVOKED"
              ? `Freigabe zurückgenommen von ${feedback.actorName} am ${formatDateTime(feedback.at)}`
              : `Abgelehnt von ${feedback.actorName} am ${formatDateTime(feedback.at)}`
          }
        >
          <p className="break-words whitespace-pre-wrap" data-testid="review-feedback-text">
            {feedback.kind === "REVOKED" ? "Begründung: " : "Gesamtkommentar: "}
            {feedback.text}
          </p>
        </Notice>
      ) : null}

      {approval ? (
        <Notice tone="success" role={null}>
          <p className="font-medium" data-testid="approval-note">
            Freigegeben von {approval.actorName} am {formatDateTime(approval.at)}
          </p>
        </Notice>
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
            holiday: !!federalState && isPublicHoliday(day.date, federalState),
            dayType: day.dayType ?? "",
            activities: day.activities,
          }))}
        />
      ) : actions.includes("APPROVE") ? (
        <ReviewForm
          action={transition}
          seen={seen}
          canReject={actions.includes("REJECT")}
          nextHref={nextHref}
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
          <Notice
            tone="info"
            role={null}
            action={
              actions.includes("WITHDRAW") ? (
                <WithdrawForm action={transition} seen={seen} />
              ) : actions.includes("REVOKE_APPROVAL") ? (
                <RevokeForm action={transition} seen={seen} />
              ) : undefined
            }
          >
            <p data-testid="report-editable">{readOnlyText}</p>
          </Notice>
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-5" aria-label="Tage">
            {report.days.map((day) => (
              <li
                key={day.id}
                data-testid="report-day"
                className={`rounded-card border-border min-w-0 space-y-2 border p-4 ${
                  day.outsideTraining ? "bg-surface-muted text-fg-muted" : "bg-surface"
                }`}
              >
                <p className="font-semibold">{dayLabel(day.date)}</p>
                <p className="text-fg-muted text-sm">{dayTypeLabel(day)}</p>
                {(dayComments[day.id] ?? []).map((comment, index) => (
                  <p
                    key={index}
                    data-testid="day-comment"
                    className="border-overdue/40 bg-overdue-bg text-overdue rounded-md border p-2 text-sm break-words whitespace-pre-wrap"
                  >
                    <span className="font-medium">Kommentar des Ausbilders: </span>
                    {comment}
                  </p>
                ))}
                {day.activities ? <p className="break-words whitespace-pre-wrap">{day.activities}</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <ReportHistory rounds={groupHistory(changes, comments)} />
    </div>
  );
}
