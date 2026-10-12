import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePerson } from "@/lib/session";
import { createPersonAction } from "../actions";
import { PersonForm } from "../PersonForm";

export const metadata: Metadata = { title: "Person anlegen" };

/** Person anlegen (AK-201): Firmen-E-Mail, Name und Rolle; beim ersten Login wird das Konto gebunden. */
export default async function NewPersonPage() {
  await requirePerson("TRAINER");
  const trainers = await db().person.findMany({
    where: { role: "TRAINER", active: true },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader
        back={{ href: "/ausbilder/personen", label: "Zurück zu Personen" }}
        title="Person anlegen"
        subtitle="Die Person meldet sich mit ihrem Firmenkonto an. Beim ersten Login wird sie über die bestätigte Firmen-E-Mail zugeordnet; danach zählt nur noch das Konto, auch wenn sich die E-Mail später ändert."
      />
      <Card>
        <PersonForm
          action={createPersonAction}
          initial={{}}
          trainers={trainers}
          submitLabel="Person anlegen"
          emailHint="Genau die E-Mail des Firmenkontos, z. B. vorname.nachname@firma.de"
        />
      </Card>
    </div>
  );
}
