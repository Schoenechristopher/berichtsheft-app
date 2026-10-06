# Berichtsheft-App

Digitales Berichtsheft: Azubis erfassen ihre Wochenberichte (Mo–Fr), Ausbilder prüfen, geben frei oder lehnen mit Kommentar ab.

- [Spezifikation und Akzeptanzkriterien](docs/01-spezifikation.md)
- [Plan: Technik und Hosting](docs/02-plan.md)
- [Auftrag Etappe 1](AUFTRAG-ETAPPE-1.md)

Status: Etappe 1 (Grundgerüst) – Anmelden und Abmelden über das Firmenkonto, Startseite je Rolle (Platzhalter).

## Demo starten in drei Schritten

Voraussetzung: Docker mit Docker Compose.

1. Repository klonen und hineinwechseln: `git clone … && cd berichtsheft-app`
2. Alles starten: `docker compose up --build` (beim ersten Mal dauert der Build einige Minuten)
3. Im Browser <http://localhost:3000> öffnen und mit einem Testkonto anmelden.

Eine `.env` ist für die Demo nicht nötig; alle Werte haben Voreinstellungen. Wer Ports oder Werte ändern will, kopiert `.env.example` nach `.env`.

### Testkonten (nur Testdaten)

Die Anmeldung läuft über Keycloak als Ersatz für das Firmenkonto. Benutzername und Passwort sind jeweils gleich.

| Konto | Passwort | Rolle in der App |
| --- | --- | --- |
| `anna` | `anna` | Azubi, Beginn 01.09.2026, zugeordnet Bernd |
| `bernd` | `bernd` | Ausbilder (Admin) |
| `clara` | `clara` | Ausbilderin (Admin, Vertretung) |
| `dora` | `dora` | Konto ohne Eintrag in der App → „Kein Zugang – bitte an den Ausbilder wenden“ |

### Adressen

| Dienst | Adresse | Zugang |
| --- | --- | --- |
| Berichtsheft-App | <http://localhost:3000> | Testkonten oben |
| Keycloak (Test-Login) | <http://localhost:8080> | Admin-Konsole: `admin` / `admin` |
| Mailpit (abgefangene E-Mails) | <http://localhost:8025> | – |

Beenden mit `Strg+C` bzw. `docker compose down`; `docker compose down -v` löscht zusätzlich die Datenbank.

## Aufbau

| Dienst | Aufgabe |
| --- | --- |
| `app` | Next.js-App; wendet beim Start die Migrationen an und legt die Testdaten an (idempotent) |
| `worker` | pg-boss-Worker für zeitgesteuerte Jobs (Etappe 1: nur Start und Verbindung) |
| `db` | PostgreSQL 16 |
| `keycloak` | OIDC-Identity-Provider mit Realm `berichtsheft` (`keycloak/realm-berichtsheft.json`) |
| `mailpit` | fängt alle E-Mails ab |

- Fachregeln liegen als reine Funktionen in `src/domain/`; „jetzt“ kommt nur aus dem Uhr-Modul `src/domain/clock.ts`.
- Datenmodell: `prisma/schema.prisma`, Migrationen in `prisma/migrations/`. Die Historie (`status_change`) ist per Datenbank-Trigger unveränderlich.
- Anmeldung: Auth.js mit OpenID Connect (`src/auth.ts`). Personen werden über die stabile Konto-ID (`sub`, bei Entra ID `oid`) zugeordnet, nicht über Namen. Für Microsoft Entra ID werden nur Umgebungsvariablen getauscht (`AUTH_OIDC_*`, siehe `.env.example`).

## Entwicklung

Voraussetzung: Node.js 22.

```bash
npm ci
cp .env.example .env
docker compose up -d db keycloak mailpit   # nur die Hilfsdienste
npm run db:migrate && npm run db:seed
npm run dev                                 # http://localhost:3000
npm run worker                              # optional, eigener Prozess
```

Ohne Keycloak (z. B. wenn das Image nicht geladen werden kann): in `.env` `AUTH_TEST_LOGIN=true` setzen. Dann bietet die Anmeldeseite einen Test-Login für die Testkonten an. Er ist bei `NODE_ENV=production` immer abgeschaltet.

### Tests

| Befehl | Prüft |
| --- | --- |
| `npm run lint`, `npm run format:check`, `npm run typecheck` | Codequalität |
| `npm test` | Vitest: Fachlogik (`src/**/*.test.ts`) und Datenbank (`tests/db/`, braucht `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright gegen die laufende Demo (`docker compose up`), Login über Keycloak |
| `E2E_LOGIN_MODE=test npm run test:e2e` | Playwright mit Test-Login, startet `next dev` selbst (ohne Keycloak) |

Tests zu Akzeptanzkriterien beginnen mit der AK-ID, z. B. `AK-102 Firmenkonto ohne Eintrag wird mit Hinweis abgewiesen`. GitHub Actions führt bei jedem Push Lint, Typecheck und Vitest aus, startet dann `docker compose up` und lässt Playwright gegen die laufende Demo laufen.
