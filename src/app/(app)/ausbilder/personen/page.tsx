import Link from "next/link";
import { roleLabel } from "@/domain/access";
import { Badge, Notice, primaryButtonClass } from "@/components/ui";
import { db } from "@/lib/db";
import { SUCCESS_MESSAGES, trainingPeriod } from "@/lib/people/labels";
import { listPeople } from "@/lib/people/service";
import { requirePerson } from "@/lib/session";

/** Nutzerverwaltung: Liste aller Personen (nur Ausbilder, AK-104). */
export default async function PeoplePage({ searchParams }: PageProps<"/ausbilder/personen">) {
  await requirePerson("TRAINER");
  const people = await listPeople(db());
  const { meldung } = await searchParams;
  const success = typeof meldung === "string" ? SUCCESS_MESSAGES[meldung] : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Personen</h1>
        <Link href="/ausbilder/personen/neu" className={primaryButtonClass}>
          Person anlegen
        </Link>
      </div>
      {success ? <Notice tone="success">{success}</Notice> : null}

      <ul className="space-y-3" aria-label="Personen">
        {people.map((person) => (
          <li key={person.id} data-testid="person-row">
            <Link
              href={`/ausbilder/personen/${person.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium break-words text-slate-900">{person.name}</span>
                <Badge tone={person.role === "TRAINER" ? "blue" : "slate"}>{roleLabel(person.role)}</Badge>
                {person.active ? <Badge tone="green">aktiv</Badge> : <Badge tone="slate">deaktiviert</Badge>}
                {person.accountId === null ? <Badge tone="amber">noch nie angemeldet</Badge> : null}
              </div>
              <p className="mt-1 text-sm break-all text-slate-600">{person.email}</p>
              {person.role === "TRAINEE" ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-slate-500">Ausbilder</dt>
                  <dd className="text-slate-800">{person.trainer?.name ?? "–"}</dd>
                  <dt className="text-slate-500">Ausbildung</dt>
                  <dd className="text-slate-800">{trainingPeriod(person.trainingStart, person.trainingEnd)}</dd>
                </dl>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
