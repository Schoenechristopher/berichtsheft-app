import { db } from "@/lib/db";
import { countUnread } from "@/lib/notifications/service";
import { getCurrentPerson } from "@/lib/session";

/** Zähler der Glocke (AK-1015): ungelesene App-Benachrichtigungen der angemeldeten Person. */
export async function GET() {
  const person = await getCurrentPerson();
  if (!person) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ unread: await countUnread(db(), person.id) }, { headers: { "Cache-Control": "no-store" } });
}
