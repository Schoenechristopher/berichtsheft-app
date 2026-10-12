#!/bin/bash
# Startskript für Cloud-Sitzungen (docs/09-spec-kosteneffizienz.md, KE-S01).
# Richtet PostgreSQL, .env, Abhängigkeiten, Migration und Seed ein, damit eine neue Sitzung
# sofort Lint, Typecheck, Vitest und Playwright (Test-Login) ausführen kann.
# Idempotent: Jeder Schritt prüft, ob er schon erledigt ist. Läuft nur in Cloud-Sitzungen.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
LOG=/tmp/session-start.log
: > "$LOG"
trap 'echo "Startskript fehlgeschlagen, letzte Zeilen aus $LOG:"; tail -n 20 "$LOG"' ERR

# PostgreSQL 16 ist im Container installiert, startet aber nicht von selbst.
if ! pg_isready -q -h localhost -p 5432; then
  service postgresql start >> "$LOG" 2>&1
  for _ in $(seq 1 30); do
    pg_isready -q -h localhost -p 5432 && break
    sleep 1
  done
fi

# Rolle und Datenbanken wie in .env.example (Demo-Werte, keine Geheimnisse).
psql_admin() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qtAc "$1"; }
if [ "$(psql_admin "SELECT 1 FROM pg_roles WHERE rolname = 'berichtsheft'")" != "1" ]; then
  psql_admin "CREATE ROLE berichtsheft LOGIN PASSWORD 'berichtsheft' CREATEDB" >> "$LOG" 2>&1
fi
for db in berichtsheft berichtsheft_test; do
  if [ "$(psql_admin "SELECT 1 FROM pg_database WHERE datname = '$db'")" != "1" ]; then
    psql_admin "CREATE DATABASE $db OWNER berichtsheft" >> "$LOG" 2>&1
  fi
done

if [ ! -f .env ]; then
  cp .env.example .env
fi

# npm ci nur, wenn sich package-lock.json seit dem letzten Lauf geändert hat
# (postinstall erzeugt dabei auch den Prisma-Client).
LOCK_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat node_modules/.session-start-lock 2>/dev/null)" != "$LOCK_HASH" ]; then
  npm ci --no-audit --no-fund >> "$LOG" 2>&1
  echo "$LOCK_HASH" > node_modules/.session-start-lock
fi

# Migration und Seed sind idempotent.
npm run db:migrate >> "$LOG" 2>&1
npm run db:seed >> "$LOG" 2>&1

echo "Cloud-Sitzung bereit: PostgreSQL läuft, Datenbanken migriert und mit Seed, Abhängigkeiten installiert (Protokoll: $LOG)."
