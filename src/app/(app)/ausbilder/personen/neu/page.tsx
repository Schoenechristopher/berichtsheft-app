import { BackLink } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { createPersonAction } from "../actions";
import { PersonForm } from "../PersonForm";

/** Person anlegen (AK-201): Firmen-E-Mail, Name und Rolle; beim ersten Login wird das Konto gebunden. */
export default async function NewPersonPage() {
  await requirePerson("TRAINER");
  const trainers = await db().person.findMany({
    where: { role: "TRAINER", active: true },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <section className="space-y-4">
      <BackLink href="/ausbilder/personen">Personen</BackLink>
      <h1 className="text-2xl font-semibold">Person anlegen</h1>
      <p className="text-sm text-slate-600">
        Die Person meldet sich mit ihrem Firmenkonto an. Beim ersten Login wird sie über die bestätigte Firmen-E-Mail
        zugeordnet; danach zählt nur noch das Konto, auch wenn sich die E-Mail später ändert.
      </p>
      <PersonForm
        action={createPersonAction}
        initial={{}}
        trainers={trainers}
        submitLabel="Person anlegen"
        emailHint="Genau die E-Mail des Firmenkontos, z. B. vorname.nachname@firma.de"
      />
    </section>
  );
}
