import type { Metadata } from "next";
import Link from "next/link";
import { roleLabel } from "@/domain/access";
import { federalStateName } from "@/domain/federal-states";
import { ChannelSettingsForm } from "@/components/ChannelSettingsForm";
import { ThemeSettings } from "@/components/ThemeSettings";
import { Notice, PageHeader, SectionCard } from "@/components/ui";
import { db } from "@/lib/db";
import { countUndeliverable } from "@/lib/notifications/service";
import { getFederalState } from "@/lib/people/service";
import { requirePerson } from "@/lib/session";
import { updateSettingsAction } from "../ausbilder/personen/actions";
import { SettingsForm } from "../ausbilder/einstellungen/SettingsForm";
import { updateChannelsAction, updateThemeAction } from "./actions";

export const metadata: Metadata = { title: "Einstellungen" };

/**
 * Einstellungen für beide Rollen (UI-Spezifikation „Einstellungen“): Benachrichtigungen
 * (AK-1011), Darstellung (UI-AK-14), Konto (nur lesend); Ausbilder zusätzlich Zustellung mit dem
 * Bundesland der Firma (AK-209) und den nicht zustellbaren Nachrichten. Die frühere Seite
 * `/ausbilder/einstellungen` leitet hierher um.
 */
export default async function SettingsPage({ searchParams }: PageProps<"/einstellungen">) {
  const person = await requirePerson();
  const trainer = person.role === "TRAINER";
  const { meldung } = await searchParams;
  const assigned = trainer
    ? await db().person.findMany({
        where: { trainerId: person.id, role: "TRAINEE" },
        select: { name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const trainerName = person.trainerId
    ? (await db().person.findUnique({ where: { id: person.trainerId }, select: { name: true } }))?.name
    : null;
  const federalState = trainer ? await getFederalState(db()) : null;
  const undeliverable = trainer ? await countUndeliverable(db(), person) : 0;

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader title="Einstellungen" />

      <SectionCard
        id="benachrichtigungen"
        title="Benachrichtigungen"
        description="Wie Sie über eingereichte, geprüfte und offene Wochen informiert werden."
      >
        <ChannelSettingsForm action={updateChannelsAction} channels={person.channels} />
      </SectionCard>

      <SectionCard id="darstellung" title="Darstellung">
        <ThemeSettings initial={person.theme} save={updateThemeAction} />
      </SectionCard>

      <SectionCard id="konto" title="Konto" description="Änderungen nimmt ein Ausbilder unter „Personen“ vor.">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
          <dt className="text-fg-muted text-sm">Name</dt>
          <dd className="break-words">{person.name}</dd>
          <dt className="text-fg-muted text-sm">Firmen-E-Mail</dt>
          <dd className="break-all">{person.email}</dd>
          <dt className="text-fg-muted text-sm">Rolle</dt>
          <dd>{roleLabel(person.role)}</dd>
          {trainer ? (
            <>
              <dt className="text-fg-muted text-sm">Zugeordnete Azubis</dt>
              <dd className="break-words">
                {assigned.length === 0 ? "keine" : assigned.map((t) => t.name).join(", ")}
              </dd>
            </>
          ) : (
            <>
              <dt className="text-fg-muted text-sm">Zugeordneter Ausbilder</dt>
              <dd className="break-words">
                {trainerName ?? "–"}
                <span className="text-fg-muted block text-sm">Vertretung: jeder andere Ausbilder</span>
              </dd>
            </>
          )}
        </dl>
      </SectionCard>

      {trainer && federalState ? (
        <SectionCard id="zustellung" title="Zustellung" description="Nur für Ausbilder.">
          {meldung === "gespeichert" ? (
            <Notice tone="success">Gespeichert: Bundesland {federalStateName(federalState)}.</Notice>
          ) : null}
          <SettingsForm action={updateSettingsAction} federalState={federalState} />
          <p className="text-sm">
            <Link href="/ausbilder/nicht-zustellbar" className="text-accent font-medium underline">
              Nicht zustellbare Nachrichten
            </Link>{" "}
            <span className="text-fg-muted">({undeliverable === 0 ? "keine" : undeliverable})</span>
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
