import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Jede Verbindung läuft in UTC. Der Treiber-Adapter liest `timestamptz` sonst falsch, sobald der
 * Datenbank-Server in einer anderen Zeitzone läuft (z. B. TZ=Europe/Berlin im Compose-Stack):
 * Zeitstempel aus `now()` oder Roh-SQL wären dann um die Zeitzonendifferenz verschoben.
 */
export const DB_SESSION_OPTIONS = "-c TimeZone=UTC";

/** Erzeugt einen Prisma-Client für die angegebene Datenbank (App, Worker, Seed und Tests). */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, options: DB_SESSION_OPTIONS }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example).");
  }
  return url;
}

/**
 * Gemeinsamer Prisma-Client der App. Wird erst beim ersten Zugriff erzeugt, damit
 * `next build` ohne Datenbankverbindung durchläuft. Im Entwicklungsmodus bleibt die
 * Instanz über Hot Reloads erhalten.
 */
export function db(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient(databaseUrl());
  return globalForPrisma.prisma;
}
