/**
 * Worker-Prozess (eigener Container): führt zeitgesteuerte Jobs per pg-boss aus und
 * versendet ab Etappe 6 die Outbox. Seit Etappe 3: tägliche Erzeugung der Wochenberichte.
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import { now } from "../domain/clock";
import { APP_TIME_ZONE } from "../domain/report-generation";
import { createPrismaClient } from "../lib/db";
import { ensureReportsForAllTrainees } from "../lib/reports";

/** Queue für den Lebenszeichen-Job, mit dem der Worker die Verbindung prüft. */
export const HEARTBEAT_QUEUE = "worker-heartbeat";

/** Queue für die Erzeugung der Wochenberichte (AK-301, AK-302). */
export const GENERATE_REPORTS_QUEUE = "generate-weekly-reports";

/** Täglich um 0:05 Uhr Europe/Berlin – kurz nach Beginn einer neuen Woche ist ihr Bericht da. */
export const GENERATE_REPORTS_CRON = "5 0 * * *";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example).");
  }

  const boss = new PgBoss({ connectionString, schema: "pgboss" });
  boss.on("error", (error) => console.error("[worker] pg-boss-Fehler:", error));
  await boss.start();

  await boss.createQueue(HEARTBEAT_QUEUE);
  await boss.work(HEARTBEAT_QUEUE, async () => {
    console.log("[worker] Lebenszeichen-Job verarbeitet.");
  });
  await boss.send(HEARTBEAT_QUEUE, { startedAt: now().toISOString() });

  // Wochenberichte erzeugen: täglich per Zeitplan und einmal beim Start (holt Verpasstes nach).
  // Idempotent – auch parallele Läufe erzeugen keine Doppelten (AK-304).
  const prisma = createPrismaClient(connectionString);
  await boss.createQueue(GENERATE_REPORTS_QUEUE);
  await boss.work(GENERATE_REPORTS_QUEUE, async () => {
    const result = await ensureReportsForAllTrainees(prisma, now());
    console.log(
      `[worker] Wochenberichte erzeugt: ${result.createdReports} neu, ${result.correctedDays} Tage korrigiert.`,
    );
  });
  await boss.schedule(GENERATE_REPORTS_QUEUE, GENERATE_REPORTS_CRON, null, { tz: APP_TIME_ZONE });
  await boss.send(GENERATE_REPORTS_QUEUE, { reason: "start" });

  console.log("[worker] gestartet, verbunden mit pg-boss (Schema „pgboss“).");

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} empfangen, beende …`);
    await boss.stop({ graceful: true, timeout: 10_000 });
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[worker] Start fehlgeschlagen:", error);
  process.exit(1);
});
