import { now } from "@/domain/clock";
import { formatDateTime } from "@/domain/report-history";
import { relativeTime } from "@/domain/relative-time";
import { db } from "@/lib/db";
import { previewNotifications } from "@/lib/notifications/service";
import { getCurrentPerson } from "@/lib/session";

/**
 * Vorschau der Glocke: die letzten 5 App-Benachrichtigungen der angemeldeten Person, ohne sie als
 * gelesen zu markieren (AK-1015 gilt erst für die Liste).
 */
export async function GET() {
  const person = await getCurrentPerson();
  if (!person) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const instant = now();
  const items = (await previewNotifications(db(), person.id)).map((item) => ({
    id: item.id,
    subject: item.subject,
    link: item.link,
    createdAt: item.createdAt.toISOString(),
    unread: item.unread,
    relative: relativeTime(item.createdAt, instant),
    absolute: formatDateTime(item.createdAt),
  }));
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
