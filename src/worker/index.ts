/**
 * Worker-Prozess (eigener Container): führt zeitgesteuerte Jobs per pg-boss aus und
 * versendet ab Etappe 6 die Outbox. In Etappe 1 nur Start und Verbindung zu pg-boss.
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import { now } from "../domain/clock";

/** Queue für den Lebenszeichen-Job, mit dem der Worker die Verbindung prüft. */
export const HEARTBEAT_QUEUE = "worker-heartbeat";

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

  console.log("[worker] gestartet, verbunden mit pg-boss (Schema „pgboss“).");

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} empfangen, beende …`);
    await boss.stop({ graceful: true, timeout: 10_000 });
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[worker] Start fehlgeschlagen:", error);
  process.exit(1);
});
