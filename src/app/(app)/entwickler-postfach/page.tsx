import { notFound } from "next/navigation";
import { formatDateTime } from "@/domain/report-history";
import { MessageText } from "@/components/MessageText";
import { Notice } from "@/components/ui";
import { db } from "@/lib/db";
import { devMailboxEnabled } from "@/lib/notifications/config";
import { listDevMailbox } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";

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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Teams-Postfach (Demo)</h1>
      <Notice tone="info">
        Hier landen in der Demo die Nachrichten des Kanals „Teams“, statt sie über Microsoft Teams zu verschicken.
        {person.role === "TRAINER" ? " Als Ausbilder sehen Sie die Nachrichten aller Personen." : null}
      </Notice>
      {messages.length === 0 ? (
        <p className="text-slate-600">Keine Teams-Nachrichten.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              data-testid="teams-message"
              className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
            >
              <h2 className="font-medium break-words text-slate-900">{message.subject}</h2>
              <p className="text-xs text-slate-500">
                An {message.recipient.name} · {formatDateTime(message.createdAt)}
              </p>
              <MessageText text={message.body} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
