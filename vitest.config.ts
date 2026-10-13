import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "tests/pruefung/**/*.test.ts"],
          // Der Daten-Runner läuft gegen die Test-Datenbank (Projekt „db“).
          exclude: [...configDefaults.exclude, "tests/pruefung/daten.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts", "tests/pruefung/daten.test.ts"],
          environment: "node",
          globalSetup: ["tests/db/global-setup.ts"],
          // Alle Datenbanktests teilen sich eine Test-Datenbank.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
