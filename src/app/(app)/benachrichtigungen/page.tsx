import type { Metadata } from "next";
import Link from "next/link";
import { now } from "@/domain/clock";
import { formatDateTime } from "@/domain/report-history";
import { relativeTime } from "@/domain/relative-time";
import { MessageText } from "@/components/MessageText";
import { Badge, EmptyState, Notice, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { openNotifications } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Benachrichtigungen" };

/**
 * Eigene Benachrichtigungen des Kanals „App“ (AK-1015), neueste zuerst, mit Link zum Bericht:
 * ungelesen-Punkt, Anlass, Zeit relativ („vor 2 Std.“, absolut im Tooltip). Das Öffnen der Liste
 * markiert sie als gelesen; was bis eben ungelesen war, trägt „Neu“.
 */
export default async function NotificationsPage() {
  const person = await requirePerson();
  const instant = now();
  const notifications = await openNotifications(db(), person.id, instant);

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <PageHeader title="Benachrichtigungen" />
      {!person.channels.includes("APP") ? (
        <Notice tone="info">
          Der Kanal „App“ ist ausgeschaltet: Neue Benachrichtigungen erscheinen hier nicht.{" "}
          <Link href="/einstellungen" className="font-medium underline">
            Einstellungen ändern
          </Link>
        </Notice>
      ) : null}
      {notifications.length === 0 ? (
        <EmptyState testId="notifications-empty">Keine Benachrichtigungen.</EmptyState>
      ) : (
        <ul
          className="divide-border rounded-card border-border bg-surface divide-y border"
          aria-label="Benachrichtigungen"
        >
          {notifications.map((item) => (
            <li
              key={item.id}
              data-testid="notification"
              data-art={item.kind}
              data-woche={item.week ?? undefined}
              className="flex gap-3 p-4"
            >
              <span
                aria-hidden="true"
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.unread ? "bg-accent" : "bg-transparent"}`}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {item.unread ? (
                    <span data-testid="notification-new">
                      <Badge tone="accent">Neu</Badge>
                    </span>
                  ) : null}
                  <h2 className="font-medium break-words">{item.subject}</h2>
                </div>
                <p className="text-fg-muted text-sm">
                  <time dateTime={item.createdAt.toISOString()} title={formatDateTime(item.createdAt)}>
                    {relativeTime(item.createdAt, instant)}
                  </time>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="text-accent inline-flex min-h-11 items-center text-sm font-medium underline lg:min-h-8"
                    >
                      {item.link.startsWith("/berichte/") ? "Zum Bericht" : "Zur Übersicht"}
                    </Link>
                  ) : null}
                </div>
                <details>
                  <summary className="text-fg-muted inline-flex min-h-11 cursor-pointer items-center text-sm lg:min-h-8">
                    Nachricht anzeigen
                  </summary>
                  <div className="mt-2">
                    <MessageText text={item.body} />
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
