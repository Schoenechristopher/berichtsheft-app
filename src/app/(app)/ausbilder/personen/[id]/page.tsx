import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { roleLabel } from "@/domain/access";
import { toDateInput } from "@/domain/weeks";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { SUCCESS_MESSAGES } from "@/lib/people/labels";
import { requirePerson } from "@/lib/session";
import { deactivatePersonAction, deletePersonAction, reactivatePersonAction, updatePersonAction } from "../actions";
import { DeleteForm, StatusButton } from "../PersonActions";
import { PersonForm } from "../PersonForm";

export const metadata: Metadata = { title: "Person bearbeiten" };

/** Person bearbeiten (AK-203), deaktivieren (AK-204) und endgültig löschen (AK-206). */
export default async function PersonPage({ params, searchParams }: PageProps<"/ausbilder/personen/[id]">) {
  await requirePerson("TRAINER");
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const person = await db().person.findUnique({
    where: { id },
    include: {
      trainer: { select: { name: true } },
      reports: { select: { id: true } },
    },
  });
  if (!person) {
    notFound();
  }
  const trainers = await db().person.findMany({
    // Aktive Ausbilder; der bisher zugeordnete bleibt wählbar, auch wenn er deaktiviert ist.
    where: {
      role: "TRAINER",
      id: { not: id },
      OR: person.trainerId ? [{ active: true }, { id: person.trainerId }] : [{ active: true }],
    },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
  const { meldung } = await searchParams;
  const success = typeof meldung === "string" ? SUCCESS_MESSAGES[meldung] : undefined;

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader
        back={{ href: "/ausbilder/personen", label: "Zurück zu Personen" }}
        title={person.name}
        meta={
          <>
            <Badge tone={person.role === "TRAINER" ? "accent" : "neutral"}>{roleLabel(person.role)}</Badge>
            {person.active ? <Badge tone="success">aktiv</Badge> : <Badge>deaktiviert</Badge>}
            {person.accountId === null ? <Badge tone="warning">noch nie angemeldet</Badge> : null}
          </>
        }
      />
      {success ? <Notice tone="success">{success}</Notice> : null}

      <Card as="section" aria-labelledby="edit-heading" className="space-y-4">
        <h2 id="edit-heading" className="text-lg font-semibold">
          Daten
        </h2>
        <PersonForm
          action={updatePersonAction.bind(null, person.id)}
          initial={{
            name: person.name,
            email: person.email,
            role: person.role,
            trainerId: person.trainerId ?? "",
            trainingStart: toDateInput(person.trainingStart),
            trainingEnd: toDateInput(person.trainingEnd),
          }}
          trainers={trainers}
          submitLabel="Änderungen speichern"
          emailHint={
            person.accountId === null
              ? "Über diese E-Mail wird das Firmenkonto beim ersten Login zugeordnet."
              : "Das Firmenkonto ist verknüpft; eine Änderung der E-Mail ändert die Anmeldung nicht."
          }
        />
      </Card>

      {person.role === "TRAINEE" ? (
        <Card as="section" aria-labelledby="reports-heading" className="space-y-2">
          <h2 id="reports-heading" className="text-lg font-semibold">
            Berichte
          </h2>
          <p className="text-fg-muted text-sm">
            {person.reports.length === 1 ? "1 Wochenbericht." : `${person.reports.length} Wochenberichte.`}{" "}
            <Link href={`/ausbilder/azubis/${person.id}`} className="text-accent font-medium underline">
              Wochenberichte ansehen
            </Link>
          </p>
        </Card>
      ) : null}

      <Card as="section" aria-labelledby="status-heading" className="space-y-3">
        <h2 id="status-heading" className="text-lg font-semibold">
          {person.active ? "Deaktivieren" : "Wieder aktivieren"}
        </h2>
        <p className="text-fg-muted text-sm">
          {person.active
            ? "Die Person kann sich danach nicht mehr anmelden. Ihre Berichte bleiben für Ausbilder lesbar, sind aber nicht mehr änderbar."
            : "Die Person kann sich danach wieder anmelden."}
        </p>
        {person.active ? (
          <StatusButton
            action={deactivatePersonAction.bind(null, person.id)}
            label="Deaktivieren"
            testId="deactivate"
          />
        ) : (
          <StatusButton
            action={reactivatePersonAction.bind(null, person.id)}
            label="Wieder aktivieren"
            testId="reactivate"
          />
        )}
      </Card>

      <Card as="section" highlight="danger" aria-labelledby="delete-heading" className="space-y-3">
        <h2 id="delete-heading" className="text-danger text-lg font-semibold">
          Endgültig löschen
        </h2>
        <p className="text-fg-muted text-sm">
          Entfernt die Person und alle ihre Berichte samt Historie unwiderruflich. Wer in der Historie von Berichten
          anderer Azubis vorkommt, kann nur deaktiviert werden.
        </p>
        <DeleteForm
          name={person.name}
          action={deletePersonAction.bind(null, person.id)}
          deactivateAction={deactivatePersonAction.bind(null, person.id)}
        />
      </Card>
    </div>
  );
}
