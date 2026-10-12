import type { Viewer } from "@/domain/report-access";
import { db } from "@/lib/db";
import { listTraineeWeeks } from "@/lib/reports";

/**
 * Alle Azubis mit Kennzahlen für Start Ausbilder und die Liste „Azubis“: offene Wochen in der
 * Vergangenheit, freigegebene Wochen, letzte Einreichung. Nur für Ausbilder (AK-105); der
 * Aufrufer prüft die Rolle.
 */
export async function listTraineesWithProgress(viewer: Viewer, instant: Date) {
  const people = await db().person.findMany({
    where: { role: "TRAINEE" },
    include: { trainer: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return Promise.all(
    people.map(async (trainee) => {
      const reports = (await listTraineeWeeks(db(), viewer, trainee.id, instant))?.reports ?? [];
      const submittedAt = reports
        .map((report) => report.lastSubmittedAt)
        .filter((date): date is Date => date !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        id: trainee.id,
        name: trainee.name,
        active: trainee.active,
        trainingStart: trainee.trainingStart,
        trainingEnd: trainee.trainingEnd,
        trainerName: trainee.trainer?.name ?? null,
        weeks: reports.length,
        approved: reports.filter((report) => report.status === "APPROVED").length,
        pastOpen: reports.filter((report) => report.pastOpen).length,
        lastSubmittedAt: submittedAt ?? null,
      };
    }),
  );
}

export type TraineeWithProgress = Awaited<ReturnType<typeof listTraineesWithProgress>>[number];
