import type { Metadata } from "next";
import { roleLabel } from "@/domain/access";
import { Badge, ButtonLink, DataList, DataRow, EmptyState, Notice, PageHeader, RowLink } from "@/components/ui";
import { db } from "@/lib/db";
import { SUCCESS_MESSAGES, trainingPeriod } from "@/lib/people/labels";
import { listPeople } from "@/lib/people/service";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Personen" };

const GRID = "md:grid-cols-[minmax(12rem,1.5fr)_8rem_minmax(10rem,1fr)_minmax(12rem,1fr)]";

/** Nutzerverwaltung: Liste aller Personen mit Rolle und Status (nur Ausbilder, AK-104). */
export default async function PeoplePage({ searchParams }: PageProps<"/ausbilder/personen">) {
  await requirePerson("TRAINER");
  const people = await listPeople(db());
  const { meldung } = await searchParams;
  const success = typeof meldung === "string" ? SUCCESS_MESSAGES[meldung] : undefined;

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader
        title="Personen"
        actions={
          <ButtonLink href="/ausbilder/personen/neu" variant="primary">
            Person anlegen
          </ButtonLink>
        }
      />
      {success ? <Notice tone="success">{success}</Notice> : null}

      {people.length === 0 ? (
        <EmptyState>Noch keine Personen.</EmptyState>
      ) : (
        <DataList
          label="Personen"
          grid={GRID}
          columns={[{ label: "Name", sort: "asc" }, { label: "Rolle" }, { label: "Status" }, { label: "Ausbildung" }]}
        >
          {people.map((person) => (
            <DataRow key={person.id} grid={GRID} data-testid="person-row">
              <span className="min-w-0">
                <RowLink href={`/ausbilder/personen/${person.id}`} className="block break-words">
                  {person.name}
                </RowLink>
                <span className="text-fg-muted block text-sm break-all">{person.email}</span>
              </span>
              <span>
                <Badge tone={person.role === "TRAINER" ? "accent" : "neutral"}>{roleLabel(person.role)}</Badge>
              </span>
              <span className="flex flex-wrap gap-2">
                {person.active ? <Badge tone="success">aktiv</Badge> : <Badge>deaktiviert</Badge>}
                {person.accountId === null ? <Badge tone="warning">noch nie angemeldet</Badge> : null}
              </span>
              <span className="text-fg-muted text-sm">
                {person.role === "TRAINEE" ? (
                  <>
                    <span className="block">Ausbilder: {person.trainer?.name ?? "–"}</span>
                    <span className="block tabular-nums">
                      {trainingPeriod(person.trainingStart, person.trainingEnd)}
                    </span>
                  </>
                ) : (
                  "–"
                )}
              </span>
            </DataRow>
          ))}
        </DataList>
      )}
    </div>
  );
}
