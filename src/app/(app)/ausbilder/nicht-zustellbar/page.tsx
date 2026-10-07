import type { Metadata } from "next";
import { CHANNEL_LABELS } from "@/domain/notifications";
import { formatDateTime } from "@/domain/report-history";
import { Badge, Notice, secondaryButtonClass } from "@/components/ui";
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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Nicht zustellbare Nachrichten</h1>
      <p className="text-sm text-slate-600">
        E-Mail- und Teams-Nachrichten, die nach mehreren Versuchen nicht versendet werden konnten oder deren Empfänger
        deaktiviert ist. Benachrichtigungen in der App sind davon nicht betroffen.
      </p>
      {meldung === "erneut" ? (
        <Notice tone="success">Die Nachricht wird beim nächsten Durchlauf erneut versendet.</Notice>
      ) : null}
      {meldung === "fehler" ? (
        <Notice tone="error">
          Die Nachricht kann nicht erneut versendet werden (bereits erledigt oder Empfänger deaktiviert).
        </Notice>
      ) : null}
      {items.length === 0 ? (
        <p className="text-slate-600" data-testid="undeliverable-empty">
          Keine nicht zustellbaren Nachrichten.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid="undeliverable"
              className="space-y-1 rounded-md border border-red-200 bg-white p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">{CHANNEL_LABELS[item.channel]}</Badge>
                <span className="font-medium text-slate-900">
                  An {item.recipient.name}
                  {item.recipient.active ? "" : " (deaktiviert)"}
                </span>
              </div>
              <p className="break-words text-slate-800" data-testid="undeliverable-subject">
                Anlass: {item.subject}
              </p>
              <p className="text-slate-600">
                Letzter Versuch: {item.failedAt ? formatDateTime(item.failedAt) : "–"} · Versuche: {item.attempts}
              </p>
              <p className="break-words text-red-800" data-testid="undeliverable-error">
                Fehler: {item.lastError ?? "unbekannt"}
              </p>
              {item.recipient.active ? (
                <form action={retryAction.bind(null, item.id)}>
                  <button type="submit" className={`${secondaryButtonClass} mt-1 w-full sm:w-auto`}>
                    Erneut versuchen
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
