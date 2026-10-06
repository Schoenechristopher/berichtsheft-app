import { federalStateName } from "@/domain/federal-states";
import { Notice } from "@/components/ui";
import { db } from "@/lib/db";
import { getFederalState } from "@/lib/people/service";
import { requirePerson } from "@/lib/session";
import { updateSettingsAction } from "../personen/actions";
import { SettingsForm } from "./SettingsForm";

/** Einstellungen der Firma (nur Ausbilder): Bundesland für die Feiertage (AK-209). */
export default async function SettingsPage({ searchParams }: PageProps<"/ausbilder/einstellungen">) {
  await requirePerson("TRAINER");
  const federalState = await getFederalState(db());
  const { meldung } = await searchParams;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      {meldung === "gespeichert" ? (
        <Notice tone="success">Gespeichert: Bundesland {federalStateName(federalState)}.</Notice>
      ) : null}
      <SettingsForm action={updateSettingsAction} federalState={federalState} />
    </section>
  );
}
