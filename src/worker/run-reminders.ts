/**
 * Montags-Job einmal von Hand auslösen (Demo und Entwicklung): schreibt Erinnerungen und
 * Informationen zum aktuellen Zeitpunkt der Uhr (z. B. APP_FIXED_NOW=2026-10-12T09:00:00+02:00)
 * in die Outbox und versendet sie gleich mit derselben Uhr – ein Worker mit echter Uhr würde
 * Nachrichten mit einem Zeitpunkt in der Zukunft erst dann versenden. Doppelte Läufe derselben
 * Woche erzeugen nichts doppelt.
 */
import "dotenv/config";
import { now } from "../domain/clock";
import { createPrismaClient } from "../lib/db";
import { createDeliveryAdapters } from "../lib/notifications/adapters";
import { notificationConfig } from "../lib/notifications/config";
import { deliverPendingNotifications } from "../lib/notifications/outbox";
import { runWeeklyReminders } from "../lib/notifications/service";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example).");
  }
  const prisma = createPrismaClient(url);
  try {
    const config = notificationConfig();
    const result = await runWeeklyReminders(prisma, { now: now(), baseUrl: config.baseUrl });
    console.log(`Erinnerungen zum ${now().toISOString()}: ${result.created} Benachrichtigungen angelegt.`);
    const delivery = await deliverPendingNotifications(prisma, createDeliveryAdapters(config, prisma), {
      now,
      maxAttempts: config.maxAttempts,
    });
    console.log(`Versendet: ${delivery.sent}, später erneut: ${delivery.retried}, aufgegeben: ${delivery.failed}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
