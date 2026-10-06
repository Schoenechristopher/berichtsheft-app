/**
 * Worker-Prozess (eigener Container): führt zeitgesteuerte Jobs per pg-boss aus und versendet die
 * Outbox. Jobs: tägliche Erzeugung der Wochenberichte (Etappe 3), Erinnerung montags 9:00 Uhr
 * (Etappe 6). Die Outbox (E-Mail, Teams) prüft er alle NOTIFICATION_POLL_SECONDS Sekunden.
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import { now } from "../domain/clock";
import { APP_TIME_ZONE } from "../domain/report-generation";
import { createPrismaClient } from "../lib/db";
import { createDeliveryAdapters } from "../lib/notifications/adapters";
import { notificationConfig } from "../lib/notifications/config";
import { deliverPendingNotifications } from "../lib/notifications/outbox";
import { runWeeklyReminders } from "../lib/notifications/service";
import { ensureReportsForAllTrainees } from "../lib/reports";

/** Queue für den Lebenszeichen-Job, mit dem der Worker die Verbindung prüft. */
export const HEARTBEAT_QUEUE = "worker-heartbeat";

/** Queue für die Erzeugung der Wochenberichte (AK-301, AK-302). */
export const GENERATE_REPORTS_QUEUE = "generate-weekly-reports";

/** Täglich um 0:05 Uhr Europe/Berlin – kurz nach Beginn einer neuen Woche ist ihr Bericht da. */
export const GENERATE_REPORTS_CRON = "5 0 * * *";

/** Queue für Erinnerung und Information an den Ausbilder (AK-1021 – AK-1025). */
export const WEEKLY_REMINDERS_QUEUE = "weekly-reminders";

/** Montags um 9:00 Uhr Europe/Berlin. */
export const WEEKLY_REMINDERS_CRON = "0 9 * * 1";

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

  // Erinnerung montags 9:00 Uhr. Die Ereignisschlüssel enthalten die Woche des Stichtags: Läuft der
  // Job doppelt (z. B. zwei Worker), entsteht keine zweite Nachricht.
  const config = notificationConfig();
  await boss.createQueue(WEEKLY_REMINDERS_QUEUE);
  await boss.work(WEEKLY_REMINDERS_QUEUE, async () => {
    const result = await runWeeklyReminders(prisma, { now: now(), baseUrl: config.baseUrl });
    console.log(`[worker] Erinnerungen: ${result.created} Benachrichtigungen angelegt.`);
  });
  await boss.schedule(WEEKLY_REMINDERS_QUEUE, WEEKLY_REMINDERS_CRON, null, { tz: APP_TIME_ZONE });

  // Outbox versenden (AK-1004): sicher auch bei mehreren Workern (FOR UPDATE SKIP LOCKED).
  if (config.teamsMode === "graph") {
    console.warn("[worker] TEAMS_MODE=graph: Teams über Microsoft Graph ist noch nicht angebunden.");
  }
  const adapters = createDeliveryAdapters(config, prisma);
  let stopping = false;
  let delivering: Promise<unknown> = Promise.resolve();
  const deliver = async () => {
    try {
      const result = await deliverPendingNotifications(prisma, adapters, { now, maxAttempts: config.maxAttempts });
      if (result.sent + result.retried + result.failed > 0) {
        console.log(
          `[worker] Outbox: ${result.sent} versendet, ${result.retried} später erneut, ${result.failed} aufgegeben.`,
        );
      }
    } catch (error) {
      console.error("[worker] Outbox-Versand fehlgeschlagen:", error);
    }
  };
  const loop = () => {
    if (stopping) {
      return;
    }
    delivering = deliver().finally(() => {
      if (!stopping) {
        setTimeout(loop, config.pollSeconds * 1000);
      }
    });
  };
  loop();

  console.log(
    `[worker] gestartet, verbunden mit pg-boss (Schema „pgboss“); Outbox alle ${config.pollSeconds} s, Teams: ${config.teamsMode}.`,
  );

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} empfangen, beende …`);
    stopping = true;
    await delivering;
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
