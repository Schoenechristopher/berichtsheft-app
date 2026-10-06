/**
 * Wochenberichte auf dem Server: erzeugen (AK-301 – AK-305, AK-404), anzeigen (AK-103, AK-105,
 * AK-306) und Entwürfe speichern (AK-405 – AK-407).
 *
 * Die Regeln stehen als reine Funktionen in `src/domain/`; hier werden sie mit der Datenbank
 * verbunden. „Jetzt“ übergibt der Aufrufer aus dem Uhr-Modul.
 */
import { validateDayInputs, type DayErrors, type DayInput, type DayUpdate } from "@/domain/report-days";
import { canEditReport, canViewReport, type Viewer } from "@/domain/report-access";
import {
  OPEN_STATUSES,
  correctOutsideTraining,
  planReportDays,
  weeksDue,
  type TrainingPeriod,
} from "@/domain/report-generation";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isUuid } from "@/lib/ids";
import { getFederalState, listActiveTrainees } from "@/lib/people/service";

/**
 * Berichte, die die Person sehen darf (AK-103, AK-105): Azubis nur eigene, Ausbilder alle.
 * Gleiche Regel wie `canViewReport`, als Datenbankfilter.
 */
export async function listVisibleReports(prisma: PrismaClient, viewer: Viewer) {
  if (!viewer.active) {
    return [];
  }
  return prisma.weeklyReport.findMany({
    where: viewer.role === "TRAINER" ? {} : { traineeId: viewer.id },
    include: { trainee: { select: { name: true, active: true } } },
    orderBy: [{ trainee: { name: "asc" } }, { isoYear: "desc" }, { isoWeek: "desc" }],
  });
}

/** Ergebnis einer Erzeugung: neu angelegte Berichte und korrigierte Tage. */
export interface GenerationResult {
  createdReports: number;
  correctedDays: number;
}

const NOTHING: GenerationResult = { createdReports: 0, correctedDays: 0 };

/**
 * Sorgt dafür, dass ein aktiver Azubi für jede fällige Woche genau einen Bericht hat (AK-301 – AK-304),
 * und berechnet in noch bearbeitbaren Berichten die Markierung „außerhalb der Ausbildung“ neu,
 * falls sich der Ausbildungszeitraum geändert hat (AK-203). Bestehende Berichte werden nie gelöscht.
 *
 * Idempotent und sicher bei gleichzeitigem Aufruf: Die Eindeutigkeit pro Azubi und Woche
 * (bzw. pro Bericht und Datum) lässt Doppelte gar nicht erst entstehen; alles läuft in einer
 * Transaktion, damit niemand einen Bericht ohne Tage sieht.
 */
export async function ensureReportsForTrainee(
  prisma: PrismaClient,
  traineeId: string,
  now: Date,
): Promise<GenerationResult> {
  const trainee = await prisma.person.findUnique({ where: { id: traineeId } });
  // AK-205: Für deaktivierte Azubis entstehen keine neuen Wochenberichte.
  if (!trainee || trainee.role !== "TRAINEE" || !trainee.active || !trainee.trainingStart) {
    return NOTHING;
  }
  const period: TrainingPeriod = { start: trainee.trainingStart, end: trainee.trainingEnd };
  const federalState = await getFederalState(prisma);
  const weeks = weeksDue(period, now);

  return prisma.$transaction(async (tx) => {
    const created = await tx.weeklyReport.createMany({
      data: weeks.map((week) => ({ traineeId, ...week })),
      skipDuplicates: true,
    });

    // Tage ergänzen, wo sie fehlen: bei neuen Berichten alle fünf, sonst nur die fehlenden.
    const reports = await tx.weeklyReport.findMany({
      where: { traineeId },
      select: {
        id: true,
        isoYear: true,
        isoWeek: true,
        status: true,
        days: { select: { id: true, date: true, dayType: true, outsideTraining: true } },
      },
    });
    const missingDays = reports
      .filter((report) => report.days.length < 5)
      .flatMap((report) => {
        const existing = new Set(report.days.map((day) => day.date.getTime()));
        return planReportDays(report, period, federalState)
          .filter((day) => !existing.has(day.date.getTime()))
          .map((day) => ({ reportId: report.id, ...day }));
      });
    if (missingDays.length > 0) {
      await tx.reportDay.createMany({ data: missingDays, skipDuplicates: true });
    }

    // AK-203: geänderter Ausbildungszeitraum – nur in Berichten, die der Azubi noch bearbeiten kann.
    let correctedDays = 0;
    for (const report of reports) {
      if (!OPEN_STATUSES.includes(report.status)) {
        continue;
      }
      for (const correction of correctOutsideTraining(report.days, period, federalState)) {
        await tx.reportDay.update({
          where: { id: correction.id },
          data: { outsideTraining: correction.outsideTraining, dayType: correction.dayType },
        });
        correctedDays++;
      }
    }
    return { createdReports: created.count, correctedDays };
  });
}

/** Erzeugung für alle aktiven Azubis (täglicher Job im Worker). */
export async function ensureReportsForAllTrainees(prisma: PrismaClient, now: Date): Promise<GenerationResult> {
  const total = { ...NOTHING };
  for (const trainee of await listActiveTrainees(prisma)) {
    const result = await ensureReportsForTrainee(prisma, trainee.id, now);
    total.createdReports += result.createdReports;
    total.correctedDays += result.correctedDays;
  }
  return total;
}

/**
 * Übersicht eines Azubis (AK-306): alle Wochen, neueste zuerst. Azubis sehen nur die eigene,
 * Ausbilder die jedes Azubis (nur lesend). Gibt null zurück, wenn der Zugriff nicht erlaubt ist.
 */
export async function listTraineeWeeks(prisma: PrismaClient, viewer: Viewer, traineeId: string) {
  if (!canViewReport(viewer, { traineeId })) {
    return null;
  }
  const trainee = await prisma.person.findUnique({
    where: { id: traineeId },
    select: { id: true, name: true, role: true, active: true, trainingStart: true, trainingEnd: true },
  });
  if (!trainee || trainee.role !== "TRAINEE") {
    return null;
  }
  const reports = await prisma.weeklyReport.findMany({
    where: { traineeId },
    select: { id: true, isoYear: true, isoWeek: true, status: true },
    orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
  });
  return { trainee, reports };
}

/** Ergebnis des Speicherns, so wie die Oberfläche es anzeigt. */
export type SaveResult =
  | { ok: true; days: { id: string; dayType: string; activities: string }[] }
  | { ok: false; formError?: string; dayErrors?: DayErrors };

const NOT_EDITABLE = "Dieser Bericht kann nicht mehr bearbeitet werden.";

/**
 * Entwurf speichern (AK-406): Tagesart und Tätigkeiten je Tag. Nur der eigene, aktive Azubi und
 * nur in „Entwurf“ oder „Abgelehnt“ (AK-204, `canEditReport`). Der Bericht ist dabei gesperrt,
 * damit ein gleichzeitiger Statuswechsel nicht übergangen wird.
 */
export async function saveReportDays(
  prisma: PrismaClient,
  viewer: Viewer,
  reportId: string,
  inputs: ReadonlyMap<string, DayInput>,
): Promise<SaveResult> {
  if (!isUuid(reportId)) {
    return { ok: false, formError: "Bericht nicht gefunden." };
  }
  return prisma.$transaction(async (tx) => {
    // Sperrt den Bericht bis zum Ende der Transaktion: Ein gleichzeitiger Statuswechsel (Etappe 4)
    // wartet, und der Status unten ist der aktuelle.
    await tx.$queryRaw`SELECT 1 FROM weekly_report WHERE id = ${reportId}::uuid FOR UPDATE`;
    const report = await tx.weeklyReport.findUnique({
      where: { id: reportId },
      include: { trainee: { select: { active: true } }, days: { orderBy: { date: "asc" } } },
    });
    if (!report || !canViewReport(viewer, report)) {
      return { ok: false, formError: "Zugriff verweigert" };
    }
    if (!canEditReport(viewer, { ...report, traineeActive: report.trainee.active })) {
      return { ok: false, formError: NOT_EDITABLE };
    }
    const validation = validateDayInputs(report.days, inputs, new Map(report.days.map((day) => [day.id, day])));
    if (!validation.ok) {
      return { ok: false, dayErrors: validation.errors };
    }
    await applyDayUpdates(tx, validation.updates);
    const days = await tx.reportDay.findMany({ where: { reportId }, orderBy: { date: "asc" } });
    return {
      ok: true,
      days: days.map((day) => ({ id: day.id, dayType: day.dayType ?? "", activities: day.activities })),
    };
  });
}

async function applyDayUpdates(tx: Prisma.TransactionClient, updates: DayUpdate[]) {
  for (const update of updates) {
    await tx.reportDay.update({
      where: { id: update.id },
      data: { dayType: update.dayType, activities: update.activities },
    });
  }
}

/** Liest die Tageseingaben aus dem Formular: Felder `dayType-<id>` und `activities-<id>`. */
export function dayInputsFromForm(formData: FormData, dayIds: readonly string[]): Map<string, DayInput> {
  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : null;
  };
  return new Map(dayIds.map((id) => [id, { dayType: field(`dayType-${id}`), activities: field(`activities-${id}`) }]));
}
