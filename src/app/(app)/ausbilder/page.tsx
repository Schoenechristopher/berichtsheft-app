import Link from "next/link";
import { ReportList } from "@/components/ReportList";
import { db } from "@/lib/db";
import { listVisibleReports } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/** Startseite für Ausbilder: Nutzerverwaltung, Einstellungen, Berichte aller Azubis (AK-105). */
export default async function TrainerHomePage() {
  const person = await requirePerson("TRAINER");
  const reports = await listVisibleReports(db(), person);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}!</h1>
      <p className="text-slate-600">Startseite für Ausbilder.</p>
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
      <h2 className="text-lg font-semibold">Berichte aller Azubis</h2>
      <ReportList reports={reports} showTrainee />
      <p className="text-sm text-slate-500">Die Prüfliste folgt in Etappe 4.</p>
    </section>
  );
}
