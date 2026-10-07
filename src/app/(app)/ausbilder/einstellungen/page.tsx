import Link from "next/link";
import { federalStateName } from "@/domain/federal-states";
import { ChannelSettingsForm } from "@/components/ChannelSettingsForm";
import { Notice } from "@/components/ui";
import { db } from "@/lib/db";
import { countUndeliverable } from "@/lib/notifications/service";
import { getFederalState } from "@/lib/people/service";
import { requirePerson } from "@/lib/session";
import { updateChannelsAction } from "../../einstellungen/actions";
import { updateSettingsAction } from "../personen/actions";
import { SettingsForm } from "./SettingsForm";

/**
 * Einstellungen für Ausbilder: Bundesland der Firma für die Feiertage (AK-209) und die eigenen
 * Kanäle für Benachrichtigungen (AK-1011).
 */
export default async function SettingsPage({ searchParams }: PageProps<"/ausbilder/einstellungen">) {
  const person = await requirePerson("TRAINER");
  const undeliverable = await countUndeliverable(db(), person);
  const federalState = await getFederalState(db());
  const { meldung } = await searchParams;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      {meldung === "gespeichert" ? (
        <Notice tone="success">Gespeichert: Bundesland {federalStateName(federalState)}.</Notice>
      ) : null}
      <SettingsForm action={updateSettingsAction} federalState={federalState} />
      <h2 className="pt-4 text-lg font-semibold">Meine Benachrichtigungen</h2>
      <ChannelSettingsForm action={updateChannelsAction} channels={person.channels} />
      <h2 className="pt-4 text-lg font-semibold">Zustellung</h2>
      <p className="text-sm text-slate-600">
        <Link href="/ausbilder/nicht-zustellbar" className="text-blue-700 underline">
          Nicht zustellbare Nachrichten
        </Link>{" "}
        ({undeliverable === 0 ? "keine" : undeliverable})
      </p>
    </section>
  );
}
