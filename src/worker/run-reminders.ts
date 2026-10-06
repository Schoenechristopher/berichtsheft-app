/**
 * Montags-Job einmal von Hand auslösen (Demo und Entwicklung): schreibt Erinnerungen und
 * Informationen zum aktuellen Zeitpunkt der Uhr (z. B. APP_FIXED_NOW=2026-10-12T09:00:00+02:00)
 * in die Outbox. Versendet werden sie vom laufenden Worker. Doppelte Läufe derselben Woche
 * erzeugen nichts doppelt.
 */
import "dotenv/config";
import { now } from "../domain/clock";
import { createPrismaClient } from "../lib/db";
import { appBaseUrl } from "../lib/notifications/config";
import { runWeeklyReminders } from "../lib/notifications/service";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example).");
  }
  const prisma = createPrismaClient(url);
  try {
    const result = await runWeeklyReminders(prisma, { now: now(), baseUrl: appBaseUrl() });
    console.log(`Erinnerungen zum ${now().toISOString()}: ${result.created} Benachrichtigungen angelegt.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
