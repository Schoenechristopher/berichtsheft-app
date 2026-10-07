/**
 * Statuswechsel der Wochenberichte auf dem Server (AK-501 – AK-508, AK-601 – AK-607,
 * AK-701 – AK-704, AK-801 – AK-803).
 *
 * Jeder Wechsel läuft über `transitionReport`. Die Funktion prüft Rolle und Besitz selbst
 * (`decideTransition`), schreibt den Wechsel als bedingtes Update („nur wenn Status und Version
 * noch stimmen“) und legt in derselben Transaktion den Historieneintrag und die Kommentare an.
 * Geht etwas schief, ändert sich nichts. „Jetzt“ kommt aus dem Uhr-Modul.
 */
import { now } from "@/domain/clock";
import { canViewReport, type ReportStatus, type Viewer } from "@/domain/report-access";
import { validateDayInputs, type DayErrors, type DayInput } from "@/domain/report-days";
import { isWeekOutsideTraining } from "@/domain/report-generation";
import {
  TRANSITION_MESSAGES,
  commentTooLong,
  decideTransition,
  isBlank,
  normalizeComment,
  reviewRoundFor,
  type ReportAction,
  type SeenState,
} from "@/domain/report-status";
import {
  WEEK_OUTSIDE_TRAINING_MESSAGE,
  submissionSummary,
  validateSubmission,
  type SubmissionIssue,
} from "@/domain/report-submission";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isUuid } from "@/lib/ids";
import { appBaseUrl } from "@/lib/notifications/config";
import { recordTransitionNotifications } from "@/lib/notifications/service";

export interface TransitionInput {
  action: ReportAction;
  /** Stand, den die Person gesehen hat (Status und Version aus dem Formular), für AK-508. */
  seen?: SeenState;
  /** Gesamtkommentar (Ablehnen) bzw. Begründung (Freigabe zurücknehmen). */
  text?: string | null;
  /** Optionale Tageskommentare beim Ablehnen (AK-605), je Tag-ID. */
  dayComments?: ReadonlyMap<string, string>;
  /**
   * Beim Einreichen: die Tageseingaben aus dem Formular. Sie werden zuerst als Entwurf gespeichert
   * und dann geprüft – so zählt, was der Azubi gerade sieht.
   */
  dayInputs?: ReadonlyMap<string, DayInput>;
}

export type TransitionResult =
  | { ok: true; status: ReportStatus; version: number }
  | {
      ok: false;
      formError?: string;
      /** Fehler am Feld: Gesamtkommentar, Begründung oder ein Tageskommentar (Tag-ID). */
      fieldErrors?: Partial<Record<"comment" | "reason", string>> & { dayComments?: Record<string, string> };
      /** Fehlende Pflichtangaben beim Einreichen, je Tag (AK-502). */
      submissionIssues?: SubmissionIssue[];
      /** Fehler beim Speichern der Tageseingaben (z. B. Text zu lang). */
      dayErrors?: DayErrors;
      /** Wurden die Tageseingaben trotz gescheitertem Einreichen als Entwurf gespeichert? */
      savedDraft?: boolean;
    };

/** Ereignis eines erfolgreichen Statuswechsels – Grundlage für die Benachrichtigungen. */
export interface TransitionEvent {
  statusChangeId: string;
  action: ReportAction;
  reportId: string;
  traineeId: string;
  actorId: string;
  from: ReportStatus;
  to: ReportStatus;
  reviewRound: number;
}

/**
 * Benachrichtigungen zum Statuswechsel (Etappe 6, AK-1001 – AK-1003): in derselben Transaktion in
 * die Outbox (Tabelle `notification`) – scheitert der Wechsel, entsteht auch keine Nachricht. Wer
 * was bekommt, entscheidet `planTransitionNotifications`; der Worker versendet E-Mail und Teams.
 */
async function recordNotifications(tx: Prisma.TransactionClient, event: TransitionEvent): Promise<void> {
  await recordTransitionNotifications(tx, event, { now: now(), baseUrl: appBaseUrl() });
}

const NOT_FOUND = "Bericht nicht gefunden.";

/** Führt einen Statuswechsel aus. Gibt bei jedem Problem eine Meldung zurück, statt zu werfen. */
export async function transitionReport(
  prisma: PrismaClient,
  viewer: Viewer,
  reportId: string,
  input: TransitionInput,
): Promise<TransitionResult> {
  if (!isUuid(reportId)) {
    return { ok: false, formError: NOT_FOUND };
  }
  return prisma.$transaction(async (tx) => {
    // Sperrt den Bericht bis zum Ende der Transaktion: Gleichzeitige Wechsel und Speichervorgänge
    // warten, und der unten gelesene Stand ist der aktuelle.
    await tx.$queryRaw`SELECT 1 FROM weekly_report WHERE id = ${reportId}::uuid FOR UPDATE`;
    const report = await tx.weeklyReport.findUnique({
      where: { id: reportId },
      include: {
        trainee: { select: { active: true, trainingStart: true, trainingEnd: true } },
        days: { orderBy: { date: "asc" } },
      },
    });
    if (!report) {
      return { ok: false, formError: NOT_FOUND };
    }
    if (!canViewReport(viewer, report)) {
      return { ok: false, formError: TRANSITION_MESSAGES.forbidden };
    }

    const decision = decideTransition({
      action: input.action,
      actor: viewer,
      report: { ...report, traineeActive: report.trainee.active },
      seen: input.seen,
      text: input.text,
    });
    if (!decision.ok) {
      return decision.field
        ? { ok: false, fieldErrors: { [decision.field]: decision.message } }
        : { ok: false, formError: decision.message };
    }

    const dayComments = input.action === "REJECT" ? collectDayComments(input.dayComments, report.days) : null;
    if (dayComments && Object.keys(dayComments.errors).length > 0) {
      return { ok: false, fieldErrors: { dayComments: dayComments.errors } };
    }

    if (decision.to === "SUBMITTED") {
      const start = report.trainee.trainingStart;
      // Bestätigte Auslegung: Wochen ganz außerhalb der Ausbildung werden nicht eingereicht.
      if (start && isWeekOutsideTraining(report, { start, end: report.trainee.trainingEnd })) {
        return { ok: false, formError: WEEK_OUTSIDE_TRAINING_MESSAGE };
      }
      let savedDraft = false;
      if (input.dayInputs) {
        const stored = new Map(report.days.map((day) => [day.id, day]));
        const validation = validateDayInputs(report.days, input.dayInputs, stored);
        if (!validation.ok) {
          return { ok: false, dayErrors: validation.errors };
        }
        for (const update of validation.updates) {
          await tx.reportDay.update({
            where: { id: update.id },
            data: { dayType: update.dayType, activities: update.activities },
          });
        }
        savedDraft = validation.updates.length > 0;
      }
      const issues = validateSubmission(await tx.reportDay.findMany({ where: { reportId: report.id } }));
      if (issues.length > 0) {
        // Die Transaktion endet regulär: Gespeicherte Eingaben bleiben als Entwurf erhalten.
        return { ok: false, formError: submissionSummary(issues), submissionIssues: issues, savedDraft };
      }
    }

    // Bedingtes Update (AK-508): nur wenn Status und Version noch dem entsprechen, was oben geprüft
    // wurde. Hätte ein gleichzeitiger Wechsel schon gewonnen, scheitert dieser mit Meldung.
    const updated = await tx.weeklyReport.updateMany({
      where: { id: report.id, status: decision.from, version: report.version },
      data: { status: decision.to, version: { increment: 1 } },
    });
    if (updated.count === 0) {
      const current = await tx.weeklyReport.findUniqueOrThrow({ where: { id: report.id } });
      const retry = decideTransition({
        action: input.action,
        actor: viewer,
        report: { ...current, traineeActive: report.trainee.active },
        seen: { status: decision.from, version: report.version },
        text: input.text,
      });
      return { ok: false, formError: retry.ok ? TRANSITION_MESSAGES.changedMeanwhile : retry.message };
    }

    const submissions = await tx.statusChange.count({ where: { reportId: report.id, toStatus: "SUBMITTED" } });
    const reviewRound = reviewRoundFor(input.action, submissions);
    const createdAt = now();
    const change = await tx.statusChange.create({
      data: {
        reportId: report.id,
        fromStatus: decision.from,
        toStatus: decision.to,
        actorId: viewer.id,
        reason: input.action === "REVOKE_APPROVAL" ? decision.text : null,
        reviewRound,
        createdAt,
      },
    });
    if (input.action === "REJECT" && decision.text !== null) {
      const comment = { reportId: report.id, reviewRound, authorId: viewer.id, createdAt };
      await tx.comment.createMany({
        data: [
          { ...comment, dayId: null, text: decision.text },
          ...[...(dayComments?.comments ?? [])].map(([dayId, text]) => ({ ...comment, dayId, text })),
        ],
      });
    }

    await recordNotifications(tx, {
      statusChangeId: change.id,
      action: input.action,
      reportId: report.id,
      traineeId: report.traineeId,
      actorId: viewer.id,
      from: decision.from,
      to: decision.to,
      reviewRound,
    });
    return { ok: true, status: decision.to, version: report.version + 1 };
  });
}

/** Nicht leere Tageskommentare zu Tagen dieses Berichts (AK-605); zu lange ergeben einen Fehler am Feld. */
function collectDayComments(inputs: ReadonlyMap<string, string> | undefined, days: readonly { id: string }[]) {
  const comments = new Map<string, string>();
  const errors: Record<string, string> = {};
  for (const day of days) {
    const text = inputs?.get(day.id);
    if (text === undefined || isBlank(text)) {
      continue;
    }
    const normalized = normalizeComment(text);
    if (commentTooLong(normalized)) {
      errors[day.id] = TRANSITION_MESSAGES.tooLong;
    }
    comments.set(day.id, normalized);
  }
  return { comments, errors };
}
