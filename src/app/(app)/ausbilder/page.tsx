import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { now } from "@/domain/clock";
import { EmptyState, ListSkeleton } from "@/components/ui";
import { ClipboardIcon, ClockIcon } from "@/components/ui/icons";
import { TraineeList } from "@/components/TraineeList";
import { db } from "@/lib/db";
import { ensureReportsForAllTrainees, listReviewQueue } from "@/lib/reports";
import { requirePerson } from "@/lib/session";
import { listTraineesWithProgress } from "@/lib/trainee-overview";

export const metadata: Metadata = { title: "Start" };

type Person = Awaited<ReturnType<typeof requirePerson>>;

/**
 * Start Ausbilder (UI-Spezifikation): Kacheln „Zu prüfen (n)“ (AK-601) und „Azubis mit
 * überfälligen Wochen (n)“, darunter die Azubis mit Fortschritt (AK-105).
 */
export default async function TrainerHomePage() {
  const person = await requirePerson("TRAINER");
  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <h1 className="text-2xl font-semibold">Hallo {person.name.split(" ")[0]}</h1>
      <Suspense fallback={<ListSkeleton rows={3} label="Übersicht wird geladen" />}>
        <TrainerStart person={person} />
      </Suspense>
    </div>
  );
}

const TILE =
  "group flex min-h-24 items-start gap-4 rounded-card border border-border bg-surface p-4 hover:border-accent md:p-6";

async function TrainerStart({ person }: { person: Person }) {
  const instant = now();
  await ensureReportsForAllTrainees(db(), instant);
  const toReview = await listReviewQueue(db(), person, "mine");
  const trainees = await listTraineesWithProgress(person, instant);
  const overdue = trainees.filter((trainee) => trainee.active && trainee.pastOpen > 0).length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/ausbilder/pruefliste" className={TILE}>
          <span className="bg-accent-soft text-accent inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <ClipboardIcon />
          </span>
          <span className="min-w-0">
            <span className="text-accent block text-lg font-semibold group-hover:underline">
              Zu prüfen ({toReview.length})
            </span>
            <span className="text-fg-muted block text-sm" data-testid="review-count">
              {toReview.length === 0
                ? "nichts zu prüfen"
                : toReview.length === 1
                  ? "1 Bericht Ihrer Azubis"
                  : `${toReview.length} Berichte Ihrer Azubis`}
            </span>
          </span>
        </Link>
        <Link href="/ausbilder/azubis" className={TILE}>
          <span className="bg-overdue-bg text-overdue inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <ClockIcon />
          </span>
          <span className="min-w-0">
            <span className="text-accent block text-lg font-semibold group-hover:underline">
              Azubis mit überfälligen Wochen ({overdue})
            </span>
            <span className="text-fg-muted block text-sm">offene Wochen vor der aktuellen</span>
          </span>
        </Link>
      </div>
      <section aria-labelledby="azubis-heading" className="space-y-3">
        <h2 id="azubis-heading" className="text-lg font-semibold">
          Wochenberichte der Azubis
        </h2>
        {trainees.length === 0 ? (
          <EmptyState>Noch keine Azubis. Neue Azubis legen Sie unter „Personen“ an.</EmptyState>
        ) : (
          <TraineeList trainees={trainees} />
        )}
      </section>
    </>
  );
}
