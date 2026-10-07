import type { Metadata } from "next";
import Link from "next/link";
import { now } from "@/domain/clock";
import { Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { trainingPeriod } from "@/lib/people/labels";
import { ensureReportsForAllTrainees, listReviewQueue, listTraineeWeeks } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Start" };

/** Startseite für Ausbilder: Prüfliste (AK-601), Azubis mit ihren Wochenberichten (AK-105), Verwaltung. */
export default async function TrainerHomePage() {
  const person = await requirePerson("TRAINER");
  const instant = now();
  await ensureReportsForAllTrainees(db(), instant);
  const people = await db().person.findMany({
    where: { role: "TRAINEE" },
    include: { trainer: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const toReview = await listReviewQueue(db(), person, "mine");
  const trainees = await Promise.all(
    people.map(async (trainee) => ({
      ...trainee,
      reports: (await listTraineeWeeks(db(), person, trainee.id, instant))?.reports ?? [],
    })),
  );

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/ausbilder/pruefliste"
          className="rounded-lg border border-slate-200 bg-white p-4 font-medium text-blue-800 hover:border-blue-400"
        >
          Prüfliste
          <span className="block text-sm font-normal text-slate-600" data-testid="review-count">
            {toReview.length === 0
              ? "nichts zu prüfen"
              : toReview.length === 1
                ? "1 Bericht Ihrer Azubis"
                : `${toReview.length} Berichte Ihrer Azubis`}
          </span>
        </Link>
        <Link
          href="/ausbilder/personen"
          className="rounded-lg border border-slate-200 bg-white p-4 font-medium text-blue-800 hover:border-blue-400"
        >
          Personen verwalten
        </Link>
        <Link
          href="/ausbilder/einstellungen"
          className="rounded-lg border border-slate-200 bg-white p-4 font-medium text-blue-800 hover:border-blue-400"
        >
          Einstellungen
        </Link>
      </div>
      <h2 className="text-lg font-semibold">Wochenberichte der Azubis</h2>
      {trainees.length === 0 ? (
        <p className="text-sm text-slate-600">Noch keine Azubis.</p>
      ) : (
        <ul className="space-y-2" aria-label="Azubis">
          {trainees.map((trainee) => {
            const pastOpen = trainee.reports.filter((report) => report.pastOpen).length;
            return (
              <li key={trainee.id}>
                <Link
                  href={`/ausbilder/azubis/${trainee.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-400"
                >
                  <span className="block font-medium break-words text-blue-800">{trainee.name}</span>
                  <span className="block text-sm text-slate-600">
                    {trainingPeriod(trainee.trainingStart, trainee.trainingEnd)} · {trainee.reports.length} Wochen
                    {trainee.trainer ? ` · zugeordnet ${trainee.trainer.name}` : ""}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-2">
                    {trainee.active ? null : <Badge tone="slate">deaktiviert</Badge>}
                    {pastOpen > 0 ? <Badge tone="amber">{pastOpen} vergangene offen</Badge> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
