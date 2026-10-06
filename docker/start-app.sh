#!/bin/sh
# Start der App im Container: Migrationen anwenden, Testdaten anlegen, App starten.
set -e

echo "[app] Datenbank-Migrationen anwenden …"
npx prisma migrate deploy

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "[app] Testdaten (Anna, Bernd, Clara) anlegen …"
  npx tsx prisma/seed.ts
fi

echo "[app] Starte Next.js …"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
