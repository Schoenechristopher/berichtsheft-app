import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/domain/report-history";
import { MessageText } from "@/components/MessageText";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { devMailboxEnabled } from "@/lib/notifications/config";
import { listDevMailbox } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Teams-Postfach (Demo)" };

/**
 * Entwickler-Postfach: simulierter Kanal „Teams“ der Demo (TEAMS_MODE=entwickler-postfach).
 * Mit echter Teams-Anbindung (TEAMS_MODE=graph) gibt es die Seite nicht. Azubis sehen ihre
 * eigenen Nachrichten, Ausbilder alle.
 */
export default async function DevMailboxPage() {
  if (!devMailboxEnabled()) {
    notFound();
  }
  const person = await requirePerson();
  const messages = await listDevMailbox(db(), person);

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader title="Teams-Postfach (Demo)" />
      <Notice tone="info">
        Hier landen in der Demo die Nachrichten des Kanals „Teams“, statt sie über Microsoft Teams zu verschicken.
        {person.role === "TRAINER" ? " Als Ausbilder sehen Sie die Nachrichten aller Personen." : null}
      </Notice>
      {messages.length === 0 ? (
        <EmptyState>Keine Teams-Nachrichten. Nachrichten des Kanals „Teams“ erscheinen hier.</EmptyState>
      ) : (
        <ul
          className="divide-border rounded-card border-border bg-surface divide-y border"
          aria-label="Teams-Nachrichten"
        >
          {messages.map((message) => (
            <li key={message.id} data-testid="teams-message" className="space-y-2 p-4">
              <h2 className="font-medium break-words">{message.subject}</h2>
              <p className="text-fg-muted text-sm">
                An {message.recipient.name} · {formatDateTime(message.createdAt)}
              </p>
              <MessageText text={message.body} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
