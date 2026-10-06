import Link from "next/link";
import { notFound } from "next/navigation";
import { roleLabel } from "@/domain/access";
import { reportStatusLabel } from "@/domain/report-access";
import { toDateInput, weekLabel } from "@/domain/weeks";
import { Badge, BackLink, Notice } from "@/components/ui";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { SUCCESS_MESSAGES } from "@/lib/people/labels";
import { requirePerson } from "@/lib/session";
import { deactivatePersonAction, deletePersonAction, reactivatePersonAction, updatePersonAction } from "../actions";
import { DeleteForm, StatusButton } from "../PersonActions";
import { PersonForm } from "../PersonForm";

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
      reports: { orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }] },
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
    <section className="space-y-6">
      <BackLink href="/ausbilder/personen">Personen</BackLink>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold break-words">{person.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge tone={person.role === "TRAINER" ? "blue" : "slate"}>{roleLabel(person.role)}</Badge>
          {person.active ? <Badge tone="green">aktiv</Badge> : <Badge tone="slate">deaktiviert</Badge>}
          {person.accountId === null ? <Badge tone="amber">noch nie angemeldet</Badge> : null}
        </div>
      </div>
      {success ? <Notice tone="success">{success}</Notice> : null}

      <section aria-labelledby="edit-heading" className="space-y-3">
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
      </section>

      {person.role === "TRAINEE" ? (
        <section aria-labelledby="reports-heading" className="space-y-2">
          <h2 id="reports-heading" className="text-lg font-semibold">
            Berichte
          </h2>
          {person.reports.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Berichte.</p>
          ) : (
            <ul className="space-y-1">
              {person.reports.map((report) => (
                <li key={report.id}>
                  <Link href={`/berichte/${report.id}`} className="text-blue-700 underline">
                    {weekLabel(report.isoYear, report.isoWeek)}
                  </Link>{" "}
                  <span className="text-sm text-slate-600">· {reportStatusLabel(report.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section aria-labelledby="status-heading" className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="status-heading" className="text-lg font-semibold">
          {person.active ? "Deaktivieren" : "Wieder aktivieren"}
        </h2>
        <p className="text-sm text-slate-600">
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
      </section>

      <section aria-labelledby="delete-heading" className="space-y-2 rounded-lg border border-red-200 bg-white p-4">
        <h2 id="delete-heading" className="text-lg font-semibold text-red-800">
          Endgültig löschen
        </h2>
        <p className="text-sm text-slate-600">
          Entfernt die Person und alle ihre Berichte samt Historie unwiderruflich. Wer in der Historie von Berichten
          anderer Azubis vorkommt, kann nur deaktiviert werden.
        </p>
        <DeleteForm
          name={person.name}
          action={deletePersonAction.bind(null, person.id)}
          deactivateAction={deactivatePersonAction.bind(null, person.id)}
        />
      </section>
    </section>
  );
}
