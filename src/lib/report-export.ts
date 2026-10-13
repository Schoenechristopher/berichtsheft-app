/**
 * PDF-Export auf dem Server (AK-901 – AK-906): Berichte laden, Zugriff prüfen, Druckdaten bauen.
 *
 * Gleiche Zugriffsregeln wie die Berichtsseite (`canViewReport`): Azubis nur eigene Berichte,
 * Ausbilder die aller Azubis, auch deaktivierter (AK-906). Unbekannte oder ungültige IDs ergeben
 * „nicht gefunden“, fremde „Zugriff verweigert“ – wie auf der Berichtsseite. Was gedruckt wird,
 * entscheiden die reinen Funktionen in `src/domain/report-pdf.ts`; das Layout steht in `src/pdf/`.
 */
import { ACCESS_DENIED_MESSAGE, canViewReport, type Viewer } from "@/domain/report-access";
import type { TrainingPeriod } from "@/domain/report-generation";
import { today } from "@/domain/weeks";
import {
  defaultExportRange,
  exportRange,
  rangeExport,
  weekExport,
  type ExportRange,
  type PdfDocument,
  type RangeReason,
} from "@/domain/report-pdf";
import type { PrismaClient } from "@/generated/prisma/client";
import { isUuid } from "@/lib/ids";
import { ensureReportsForTrainee } from "@/lib/reports";

export const NOT_FOUND_MESSAGE = "Seite nicht gefunden";

/** Fester Grund eines gescheiterten Exports (für Prüffälle, unabhängig vom Meldungstext). */
export type ExportFailureReason = "not-found" | "forbidden" | RangeReason;

export type ExportResult =
  | { ok: true; fileName: string; document: PdfDocument }
  | { ok: false; reason: ExportFailureReason; status: 400 | 403 | 404; message: string };

const notFound: ExportResult = { ok: false, reason: "not-found", status: 404, message: NOT_FOUND_MESSAGE };
const denied: ExportResult = { ok: false, reason: "forbidden", status: 403, message: ACCESS_DENIED_MESSAGE };

/** Was zu jedem Bericht geladen wird: Tage und Statuswechsel mit Namen (für den Freigabevermerk). */
const reportInclude = {
  days: { orderBy: { date: "asc" } },
  statusChanges: { include: { actor: { select: { name: true } } }, orderBy: { seq: "asc" } },
} as const;

type LoadedReport = Awaited<ReturnType<typeof loadReports>>[number];

function loadReports(prisma: PrismaClient, traineeId: string) {
  return prisma.weeklyReport.findMany({ where: { traineeId }, include: reportInclude });
}

function toReportForPdf(report: LoadedReport) {
  return {
    isoYear: report.isoYear,
    isoWeek: report.isoWeek,
    status: report.status,
    days: report.days,
    changes: report.statusChanges.map(({ actor, ...change }) => ({ ...change, actorName: actor.name })),
  };
}

function periodOf(trainee: { trainingStart: Date | null; trainingEnd: Date | null }): TrainingPeriod | null {
  return trainee.trainingStart ? { start: trainee.trainingStart, end: trainee.trainingEnd } : null;
}

/** PDF einer Woche (AK-901). Jedes Mal frisch aus der Datenbank (AK-905). */
export async function loadWeekExport(
  prisma: PrismaClient,
  viewer: Viewer,
  reportId: string,
  now: Date,
): Promise<ExportResult> {
  if (!isUuid(reportId)) {
    return notFound;
  }
  const report = await prisma.weeklyReport.findUnique({
    where: { id: reportId },
    include: { ...reportInclude, trainee: { select: { name: true, trainingStart: true, trainingEnd: true } } },
  });
  if (!report) {
    return notFound;
  }
  if (!canViewReport(viewer, report)) {
    return denied;
  }
  return { ok: true, ...weekExport(toReportForPdf(report), report.trainee.name, periodOf(report.trainee), now) };
}

/** Vorbelegung des Zeitraums für das Formular (Ausbildungsbeginn bis heute). */
export function exportRangeDefaults(
  trainee: { trainingStart: Date | null; trainingEnd: Date | null },
  now: Date,
): ExportRange | null {
  const period = periodOf(trainee);
  return period ? defaultExportRange(period, today(now)) : null;
}

/**
 * Sammel-PDF eines Azubis für den Zeitraum `from`–`to` (JJJJ-MM-TT, AK-902). Fehlen die Angaben,
 * gilt Ausbildungsbeginn bis heute. Wie die Übersicht legt der Export zuerst fehlende Wochen an.
 */
export async function loadRangeExport(
  prisma: PrismaClient,
  viewer: Viewer,
  traineeId: string,
  from: string | null,
  to: string | null,
  now: Date,
): Promise<ExportResult> {
  if (!isUuid(traineeId)) {
    return notFound;
  }
  const trainee = await prisma.person.findUnique({
    where: { id: traineeId },
    select: { id: true, name: true, role: true, trainingStart: true, trainingEnd: true },
  });
  const period = trainee ? periodOf(trainee) : null;
  if (!trainee || trainee.role !== "TRAINEE" || !period) {
    return notFound;
  }
  if (!canViewReport(viewer, { traineeId })) {
    return denied;
  }
  const parsed = exportRange(period, from, to, now);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason, status: 400, message: parsed.message };
  }
  await ensureReportsForTrainee(prisma, traineeId, now);
  const reports = (await loadReports(prisma, traineeId)).map(toReportForPdf);
  return { ok: true, ...rangeExport(reports, trainee.name, period, parsed.range, now) };
}
