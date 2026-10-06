# Berichtsheft-App

Digitales Berichtsheft: Azubis erfassen Wochenberichte (Mo–Fr), Ausbilder prüfen, geben frei oder lehnen ab.

## Verbindliche Grundlagen

- `docs/01-spezifikation.md`: freigegebene Anforderungen und Akzeptanzkriterien (AK-101 … AK-1102). Das ist die Quelle der Wahrheit für Verhalten.
- `docs/02-plan.md`: freigegebener Technik-Plan, Datenmodell, Etappen.
- Weicht etwas davon ab oder ist unklar: nachfragen, nicht raten. Spezifikation und Plan nur nach Freigabe ändern.

## Stack

TypeScript · Next.js (App Router) · Tailwind CSS · PostgreSQL + Prisma · Auth.js (OIDC; Demo: Keycloak, später Entra ID) · pg-boss (Worker) · Nodemailer → Mailpit · feiertagejs · @react-pdf/renderer · Vitest · Playwright · Docker Compose · GitHub Actions.

## Konventionen

- Sprache: Oberfläche, Fehlermeldungen, Doku und Commit-Beschreibungen auf Deutsch; Code-Bezeichner auf Englisch.
- Jeder Test zu einem Akzeptanzkriterium beginnt mit der AK-ID im Namen, z. B. `AK-102 abgewiesenes Konto sieht Hinweis`.
- Fachregeln (Status, Pflichtfelder, Wochen, Erinnerung) liegen als reine Funktionen unter `src/domain/`, ohne Abhängigkeit zu UI oder Datenbank.
- „Jetzt“ kommt ausschließlich aus dem Uhr-Modul (`src/domain/clock.ts`), nie direkt aus `new Date()` in Fachlogik.
- Jede Serveraktion prüft Rolle und Besitz selbst; UI-Ausblendung ist kein Schutz.
- Externe Dienste (Login, E-Mail, Teams) nur über Adapter, konfiguriert per Umgebungsvariablen (`.env.example` pflegen, keine Geheimnisse committen).
- Nur Testdaten (Anna, Bernd, Clara aus dem Seed), keine echten Personendaten.

## Arbeitsweise

- Pro Etappe ein Branch und ein Draft-PR; die PR-Beschreibung listet die abgedeckten AK-IDs und wie sie getestet sind.
- Vor jedem Push: Lint, Typecheck und Tests lokal grün.

## Cloud-Sitzungen (Claude Code im Web)

- Der Docker-Dienst startet nicht automatisch: `dockerd > /tmp/dockerd.log 2>&1 &` und kurz warten.
- Docker Hub funktioniert, kann aber mit 429 (Rate Limit) ablehnen; quay.io und ghcr.io sind ggf. durch die Netzwerk-Richtlinie gesperrt. Dann ohne Keycloak/Mailpit-Container testen (Test-Login-Provider nur bei `NODE_ENV !== 'production'`, SMTP-Mock) und die vollständigen Container in GitHub Actions prüfen.
- PostgreSQL 16 und Playwright-Chromium sind im Container vorinstalliert.
