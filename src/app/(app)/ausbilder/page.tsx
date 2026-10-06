import Link from "next/link";
import { now } from "@/domain/clock";
import { currentIsoWeek, isPastOpen } from "@/domain/report-generation";
import { Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { trainingPeriod } from "@/lib/people/labels";
import { ensureReportsForAllTrainees } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/** Startseite für Ausbilder: Azubis mit ihren Wochenberichten (AK-105, nur lesend), Verwaltung. */
export default async function TrainerHomePage() {
  const person = await requirePerson("TRAINER");
  const instant = now();
  await ensureReportsForAllTrainees(db(), instant);
  const currentWeek = currentIsoWeek(instant);
  const trainees = await db().person.findMany({
    where: { role: "TRAINEE" },
    include: {
      trainer: { select: { name: true } },
      reports: { select: { isoYear: true, isoWeek: true, status: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <div className="grid gap-3 sm:grid-cols-2">
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
            const pastOpen = trainee.reports.filter((report) => isPastOpen(report, currentWeek)).length;
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
      <p className="text-sm text-slate-500">Die Prüfliste folgt in Etappe 4.</p>
    </section>
  );
}
