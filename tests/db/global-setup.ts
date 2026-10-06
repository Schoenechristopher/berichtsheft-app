import { execSync } from "node:child_process";
import "dotenv/config";

/** Migriert die Test-Datenbank vor den Datenbanktests. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL ist nicht gesetzt. Datenbanktests brauchen eine eigene PostgreSQL-Datenbank (siehe .env.example).",
    );
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
