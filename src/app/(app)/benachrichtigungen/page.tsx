import type { Metadata } from "next";
import Link from "next/link";
import { now } from "@/domain/clock";
import { formatDateTime } from "@/domain/report-history";
import { MessageText } from "@/components/MessageText";
import { Badge, Notice } from "@/components/ui";
import { db } from "@/lib/db";
import { openNotifications } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Benachrichtigungen" };

/**
 * Eigene Benachrichtigungen des Kanals „App“ (AK-1015), neueste zuerst, mit Link zum Bericht.
 * Das Öffnen der Liste markiert sie als gelesen; was bis eben ungelesen war, trägt „Neu“.
 */
export default async function NotificationsPage() {
  const person = await requirePerson();
  const notifications = await openNotifications(db(), person.id, now());
  const settingsPath = person.role === "TRAINER" ? "/ausbilder/einstellungen" : "/einstellungen";

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Benachrichtigungen</h1>
      {!person.channels.includes("APP") ? (
        <Notice tone="info">
          Der Kanal „App“ ist ausgeschaltet: Neue Benachrichtigungen erscheinen hier nicht.{" "}
          <Link href={settingsPath} className="underline">
            Einstellungen ändern
          </Link>
        </Notice>
      ) : null}
      {notifications.length === 0 ? (
        <p className="text-slate-600">Keine Benachrichtigungen.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((item) => (
            <li
              key={item.id}
              data-testid="notification"
              className={`space-y-2 rounded-md border p-3 ${item.unread ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {item.unread ? (
                  <span data-testid="notification-new">
                    <Badge tone="blue">Neu</Badge>
                  </span>
                ) : null}
                <h2 className="font-medium break-words text-slate-900">{item.subject}</h2>
              </div>
              <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
              {item.link ? (
                <Link href={item.link} className="inline-block text-sm font-medium text-blue-700 underline">
                  {item.link.startsWith("/berichte/") ? "Zum Bericht" : "Zur Übersicht"}
                </Link>
              ) : null}
              <details>
                <summary className="cursor-pointer text-sm text-slate-600">Nachricht anzeigen</summary>
                <div className="mt-2">
                  <MessageText text={item.body} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
