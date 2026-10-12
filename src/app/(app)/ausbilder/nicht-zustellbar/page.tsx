import type { Metadata } from "next";
import { CHANNEL_LABELS } from "@/domain/notifications";
import { formatDateTime } from "@/domain/report-history";
import { Badge, Button, EmptyState, Notice, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { listUndeliverable } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";
import { retryAction } from "./actions";

export const metadata: Metadata = { title: "Nicht zustellbare Nachrichten" };

/**
 * Nicht zustellbare Nachrichten (bestätigte Auslegung 12): nur für Ausbilder. E-Mail und Teams,
 * die der Worker aufgegeben hat, mit Empfänger, Kanal, Anlass, letztem Versuch und Fehlermeldung.
 */
export default async function UndeliverablePage({ searchParams }: PageProps<"/ausbilder/nicht-zustellbar">) {
  const person = await requirePerson("TRAINER");
  const items = (await listUndeliverable(db(), person)) ?? [];
  const { meldung } = await searchParams;

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader
        title="Nicht zustellbare Nachrichten"
        subtitle="E-Mail- und Teams-Nachrichten, die nach mehreren Versuchen nicht versendet werden konnten oder deren Empfänger deaktiviert ist. Benachrichtigungen in der App sind davon nicht betroffen."
      />
      {meldung === "erneut" ? (
        <Notice tone="success">Die Nachricht wird beim nächsten Durchlauf erneut versendet.</Notice>
      ) : null}
      {meldung === "fehler" ? (
        <Notice tone="error">
          Die Nachricht kann nicht erneut versendet werden (bereits erledigt oder Empfänger deaktiviert).
        </Notice>
      ) : null}
      {items.length === 0 ? (
        <EmptyState testId="undeliverable-empty">Keine nicht zustellbaren Nachrichten.</EmptyState>
      ) : (
        <ul className="space-y-3" aria-label="Nicht zustellbare Nachrichten">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid="undeliverable"
              className="rounded-card border-border border-l-danger bg-surface space-y-1 border border-l-4 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning">{CHANNEL_LABELS[item.channel]}</Badge>
                <span className="font-medium">
                  An {item.recipient.name}
                  {item.recipient.active ? "" : " (deaktiviert)"}
                </span>
              </div>
              <p className="break-words" data-testid="undeliverable-subject">
                Anlass: {item.subject}
              </p>
              <p className="text-fg-muted tabular-nums">
                Letzter Versuch: {item.failedAt ? formatDateTime(item.failedAt) : "–"} · Versuche: {item.attempts}
              </p>
              <p className="text-danger break-words" data-testid="undeliverable-error">
                Fehler: {item.lastError ?? "unbekannt"}
              </p>
              {item.recipient.active ? (
                <form action={retryAction.bind(null, item.id)}>
                  <Button type="submit" variant="secondary" className="mt-2 w-full sm:w-auto">
                    Erneut versuchen
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
