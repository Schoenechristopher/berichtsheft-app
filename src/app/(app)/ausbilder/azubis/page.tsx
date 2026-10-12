import type { Metadata } from "next";
import { Suspense } from "react";
import { now } from "@/domain/clock";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { TraineeList } from "@/components/TraineeList";
import { db } from "@/lib/db";
import { ensureReportsForAllTrainees } from "@/lib/reports";
import { requirePerson } from "@/lib/session";
import { listTraineesWithProgress } from "@/lib/trainee-overview";

export const metadata: Metadata = { title: "Azubis" };

/**
 * Azubis (UI-Spezifikation): alle Azubis mit Ausbildungszeitraum, offenen Wochen und letzter
 * Einreichung (AK-105). Die Personenverwaltung bleibt unter „Personen“.
 */
export default async function TraineesPage() {
  const person = await requirePerson("TRAINER");
  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader title="Azubis" subtitle="Wochenberichte aller Azubis, auch ohne Zuordnung." />
      <Suspense fallback={<ListSkeleton label="Azubis werden geladen" />}>
        <Trainees person={person} />
      </Suspense>
    </div>
  );
}

async function Trainees({ person }: { person: Awaited<ReturnType<typeof requirePerson>> }) {
  const instant = now();
  await ensureReportsForAllTrainees(db(), instant);
  const trainees = await listTraineesWithProgress(person, instant);
  return trainees.length === 0 ? (
    <EmptyState>Noch keine Azubis. Neue Azubis legen Sie unter „Personen“ an.</EmptyState>
  ) : (
    <TraineeList trainees={trainees} />
  );
}
