import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChannelSettingsForm } from "@/components/ChannelSettingsForm";
import { requirePerson } from "@/lib/session";
import { updateChannelsAction } from "./actions";

export const metadata: Metadata = { title: "Einstellungen" };

/** Einstellungen des Azubis: Kanäle für Benachrichtigungen (AK-1011). Ausbilder haben ihre eigene Seite. */
export default async function PersonalSettingsPage() {
  const person = await requirePerson();
  if (person.role === "TRAINER") {
    redirect("/ausbilder/einstellungen");
  }
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <h2 className="text-lg font-semibold">Benachrichtigungen</h2>
      <ChannelSettingsForm action={updateChannelsAction} channels={person.channels} />
    </section>
  );
}
