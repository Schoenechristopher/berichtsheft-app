import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Erzeugt einen Prisma-Client für die angegebene Datenbank. */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
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
