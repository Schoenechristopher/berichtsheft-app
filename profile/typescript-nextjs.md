# Profil TypeScript/Next.js

Stand: 15.10.2026 (Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

Dieses Profil übersetzt die Fach-Specs unter `specs/` in die Mittel von TypeScript, Next.js und PostgreSQL. Die
TypeScript-App ist die Referenz-Umsetzung: Alle Prüffälle unter `specs/pruefung/` laufen auf ihr grün, und sie hat keine
Abweichungen von den Fach-Specs (`specs/pruefung/format.md`, „Abweichend, begründet“). Das Profil ändert keine Regel;
maßgeblich bleiben die Fach-Specs.

Gelesen wird es von der Steuerung (Abschnitte 1, 5 und 7 zuerst, `playbooks/00-steuerung.md`, Abschnitt 2) und von jeder
Entwicklersitzung der Reihe `playbooks/typescript/` (P00 bis P10). Die Pfade unter `src/`, `prisma/`, `e2e/` und
`tests/` nennen die **Zielstruktur** der Umsetzung (gleich der Referenz, damit Code-Landkarte und Playbooks dieselben
Namen tragen). Wer aus der Spec baut (Weg B), legt diese Dateien an; vorhanden sein müssen sie nicht.

## 1. Laufzeit und Versionen

| Teil | Wahl | Hinweis |
| --- | --- | --- |
| Sprache | TypeScript 5, `strict` | Oberfläche, Fehlermeldungen, Doku und Commit-Beschreibungen auf Deutsch, Code-Bezeichner auf Englisch (`CLAUDE.md`) |
| Laufzeit | Node.js ab 22.12 (`engines` in `package.json`) | Container: `node:22-alpine` |
| Web | Next.js 16 (App Router), React 19 | Serveraktionen und Route-Handler statt eigener REST-Schicht |
| Oberfläche | Tailwind CSS 4 über `@tailwindcss/postcss`, Prettier mit `prettier-plugin-tailwindcss` | Farben nur als Tokens in `src/app/globals.css` (hell und dunkel) |
| Datenbank | PostgreSQL 16 | Trigger, CHECK-Constraints und partielle Indizes werden gebraucht (Abschnitt 3) |
| Zugriff | Prisma 7 mit `@prisma/adapter-pg` | Verbindung nur über `createPrismaClient` in `src/lib/db.ts` (Abschnitt 7) |
| Anmeldung | Auth.js (`next-auth` 5, Beta) mit OpenID Connect | Demo: Keycloak, später Entra ID; beides nur über Umgebungsvariablen |
| Hintergrund | pg-boss 12 (Worker-Prozess) | gleiche Datenbank, eigene Schemata von pg-boss |
| E-Mail | Nodemailer 10 über SMTP | Demo: Mailpit |
| Feiertage | `feiertagejs` | plus eigene Ergänzungen laut M01 (`src/domain/holidays.ts`) |
| PDF | `@react-pdf/renderer` 4, Schrift Noto Sans aus `assets/fonts/` | Prüfung mit `pdfjs-dist` |
| Tests | Vitest 5, Playwright 1.56 mit `@axe-core/playwright` | Abschnitt 4 |
| Werkzeuge | ESLint 9 (`eslint-config-next`), Prettier 3, `tsx` | Zeilenbreite 120 (`.prettierrc.json`) |
| Suchdienst | keiner | |

**Verbindlich ist `package.json` im Wurzelordner**, falls es schon vorhanden ist: Versionen dort nicht ändern. Fehlt es,
wählt P00 die jeweils aktuelle Version der oben genannten Hauptversion und hält sie in `package-lock.json` fest.

## 2. Projektstruktur und Build

### 2.1 Zielstruktur

```text
specs/ docs/ playbooks/ profile/   Vorgaben (nicht ändern)
scripts/                            Werkzeuge der Qualitätssicherung (vorhanden, nicht ändern)
assets/fonts/                       Noto Sans (vorhanden)
keycloak/realm-berichtsheft.json    Demo-Realm (vorhanden)
Dockerfile, docker-compose.yml, docker/start-app.sh   Betrieb (vorhanden)
prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
src/
  domain/    reine Fachfunktionen, ohne Next.js, Prisma und Datenbank (clock, weeks, holidays, access, people, ...)
  lib/       Zugriff auf Datenbank und Plattform (db.ts, reports.ts, report-transitions.ts, people/, notifications/ ...)
  auth.ts, proxy.ts                 Auth.js-Konfiguration und Rücksprungziel
  pdf/       Layout und Rendering des PDF
  worker/    pg-boss-Zeitplan und Erinnerungslauf
  components/ app/                  Oberfläche (App Router, Gruppe "(app)" für die angemeldeten Seiten)
  generated/prisma/                 vom Generator erzeugt, nicht eingecheckt
tests/db/ tests/pruefung/           Datenbanktests, Prüf-Runner und Adapter
e2e/ e2e/pruefung/                  Browser-Tests, Ablauf-Runner und Adapter
```

Die Landkarte `specs/code-landkarte.md` ordnet jede Datei einem Modul zu; die Playbooks nennen je Modul die Dateien
dieser Zielstruktur. Wer eine Datei anders benennt, hält die Landkarte nicht ein, ändert dadurch aber keine Regel.

**Abhängigkeitsrichtung:** `src/domain/` importiert nichts aus `src/lib/`, `src/app/`, `src/components/`, Prisma oder
Next.js. `src/lib/` darf `src/domain/` benutzen, nie umgekehrt. Seiten und Serveraktionen rufen `src/lib/` auf. So bleibt
die Fachlogik 1:1 prüfbar (Prüf-Runner Ebene `fachlogik`, Abschnitt 4).

### 2.2 Konfigurationsdateien im Wurzelordner

Vorhandene Dateien prüft P00 nur; fehlende legt P00 an.

| Datei | Inhalt |
| --- | --- |
| `package.json` | Skripte der nächsten Tabelle; `postinstall` ist `prisma generate` |
| `tsconfig.json` | `strict`, `moduleResolution` `bundler`, Alias `@/*` auf `./src/*`, Next.js-Plugin |
| `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` | Standard von Next.js und Tailwind; Prettier mit Zeilenbreite 120 |
| `prisma.config.ts` | Schema `prisma/schema.prisma`, Migrationen `prisma/migrations`, Seed `tsx prisma/seed.ts`, `DATABASE_URL` |
| `vitest.config.ts` | Alias `@`; Projekt `unit` (`src/**`, `scripts/**`, `tests/pruefung/**` ohne `daten.test.ts`) und Projekt `db` (`tests/db/**`, `tests/pruefung/daten.test.ts`, `globalSetup` `tests/db/global-setup.ts`, nicht parallel zwischen Dateien) |
| `playwright.config.ts` | Projekte `chromium`, `firefox`, `msedge`, `smartphone-375`, `a11y`, `screenshots`; ein Worker; `E2E_LOGIN_MODE` `test` oder `keycloak`; `locale` `de-DE`, Zeitzone Europe/Berlin |
| `.env.example` | alle Umgebungsvariablen mit Demo-Werten (Abschnitt 5); keine Geheimnisse |

### 2.3 Skripte

| Skript | Befehl | Zweck |
| --- | --- | --- |
| `dev`, `build`, `start` | `next dev`, `next build`, `next start` | App |
| `worker` | `tsx src/worker/index.ts` | pg-boss-Zeitplan und Versand |
| `erinnerung` | `tsx src/worker/run-reminders.ts` | Erinnerungslauf von Hand (mit `APP_FIXED_NOW`) |
| `lint`, `typecheck` | `eslint`, `next typegen && tsc --noEmit` | Pflicht vor jedem Push |
| `format`, `format:check` | `prettier --write .`, `prettier --check .` | Pflicht vor jedem Push |
| `test`, `test:unit`, `test:db` | `vitest run` (alle, nur `--project unit`, nur `--project db`) | Vitest |
| `test:e2e` | `playwright test` | Browser-Tests und Ablauf-Runner |
| `db:migrate`, `db:seed` | `prisma migrate deploy`, `prisma db seed` | Datenbank |
| `ak:abdeckung`, `pruefumfang`, `landkarte` | Skripte unter `scripts/` | Qualitätssicherung der CI (vorhanden) |

### 2.4 Build

`npm run build` baut die App für den Produktivbetrieb; `npx prisma generate` muss vorher gelaufen sein (der Client liegt in
`src/generated/prisma/`). Ein Image (`Dockerfile`) enthält App und Worker; `docker/start-app.sh` wendet die Migrationen an,
lädt auf Wunsch den Seed (`SEED_DEMO_DATA=true`) und startet `next start`.

## 3. Abbildung der Bausteine

Bestätigt gegenüber der Entwurfstabelle in `docs/06-spec-architektur.md`, „Plattform-Profile“ (Spalte TypeScript/Next.js).
Pfade nach `specs/code-landkarte.md`.

| Baustein | Umsetzung | Pfad (Zielstruktur) |
| --- | --- | --- |
| Laufzeit | Node, Next.js, PostgreSQL, wie Abschnitt 1 | `package.json`, `next.config.ts` |
| Anmeldung | Auth.js mit OIDC (Keycloak, später Entra ID); Test-Login nur außerhalb des Produktivbetriebs; Sitzung als JWT, 8 Stunden | `src/auth.ts`, `src/lib/auth/config.ts`, `src/lib/auth/login.ts`, `src/lib/auth/logout.ts`, `src/app/api/auth/[...nextauth]/route.ts` |
| Rollen und Besitz | `getCurrentPerson()` liest bei jeder Anfrage die Person aus der Datenbank; jede Serveraktion prüft Rolle und Besitz selbst über `canViewReport()`, `canManagePeople()`, `canEditReport()` | `src/lib/session.ts`, `src/domain/report-access.ts`, `src/domain/access.ts` |
| Persistenz | Prisma-Schema; Trigger, CHECK-Constraints und partielle Indizes von Hand in den Migrationen | `prisma/schema.prisma`, `prisma/migrations/` |
| Transaktion und Gleichzeitigkeit | Statuswechsel in einer Transaktion: Zeile mit `SELECT … FOR UPDATE` sperren, entscheiden, bedingtes Update auf Status und `version`; Personenverwaltung serialisierbar mit Wiederholung | `src/lib/report-transitions.ts`, `src/lib/people/service.ts` |
| Historie unveränderlich | Datenbank-Trigger mit festem SQLSTATE `BH803`; Erkennung im Code am Code, nicht am Text | `prisma/migrations/20261006130221_init/migration.sql`, `prisma/migrations/20261007090000_einreichen_pruefen/migration.sql`, `prisma/migrations/20261013090000_historie_fehlercode/migration.sql`, `src/lib/history-guard.ts` |
| Uhr | eine Quelle für „jetzt“, für Tests stellbar, in `globalThis` | `src/domain/clock.ts` |
| Hintergrundjobs | pg-boss: Montag 9:00 Uhr Europe/Berlin, Nachholen beim Start und alle 10 Minuten, Versandlauf alle `NOTIFICATION_POLL_SECONDS` | `src/worker/index.ts`, `src/worker/run-reminders.ts` |
| Benachrichtigung in der App | Tabelle `notification` (Ausgangskorb, Kanal App ist gleich beim Anlegen zugestellt) und Glocke | `src/lib/notifications/service.ts`, `src/components/ui/bell.tsx`, `src/app/api/benachrichtigungen/ungelesen/route.ts`, `src/app/api/benachrichtigungen/vorschau/route.ts` |
| E-Mail | Nodemailer über SMTP mit fester Message-ID je Nachricht; Versandlauf mit `FOR NO KEY UPDATE SKIP LOCKED` | `src/lib/notifications/adapters.ts`, `src/lib/notifications/outbox.ts`, `src/lib/notifications/config.ts` |
| Teams | Adapter: Demo-Postfach in der Datenbank (`TEAMS_MODE=entwickler-postfach`) oder Microsoft Graph (nicht angebunden) | `src/lib/notifications/adapters.ts`, `src/app/(app)/entwickler-postfach/page.tsx` |
| PDF | `@react-pdf/renderer`, Noto Sans, je Woche eine Seite; Inhalt aus reinen Funktionen, Layout getrennt | `src/domain/report-pdf.ts`, `src/pdf/ReportPdf.tsx`, `src/pdf/fonts.ts`, `src/pdf/render.tsx`, `src/pdf/response.ts` |
| Oberfläche | Next.js-Seiten und Komponenten, Tailwind mit Tokens; feste Merker (`data-…`) für die Ablauf-Fälle | `src/app/(app)/layout.tsx`, `src/components/AppShell.tsx`, `src/components/ui/index.ts` |
| Dunkelmodus | Tokens in `src/app/globals.css`, Wahl System/Hell/Dunkel am Konto und im Cookie, auf dem Server gesetzt (nichts blitzt auf) | `src/domain/theme.ts`, `src/lib/theme.ts`, `src/components/ThemeSettings.tsx` |
| Prüf-Adapter | Vitest (Fachlogik, Daten) und Playwright (Ablauf) | `tests/pruefung/adapter.ts`, `tests/pruefung/daten-adapter.ts`, `e2e/pruefung/ablauf-adapter.ts` |
| Testschnittstelle | Uhr stellen, Testdaten laden, Ausgangsbestand herstellen, Erinnerungslauf auslösen; nur außerhalb von Produktion mit Test-Login, sonst 404 | `src/app/api/test/zustand/route.ts` |

**Persistenz und Migrationen.** Das logische Datenmodell steht in Abschnitt 5 der Fach-Specs M02, M03, M04, M05, M06 und M08.
Prisma-Modelle heißen englisch (`Person`, `WeeklyReport`, `ReportDay`, `StatusChange`, `Comment`, `Notification`,
`TeamsDevMessage`, `ReminderRun`, `Setting`), Tabellen und Spalten stehen in `snake_case` (`@@map`, `@map`), Schlüssel sind
UUIDs, Zeitpunkte `timestamptz(3)`, Kalendertage `date`. Was Prisma nicht ausdrücken kann, steht von Hand in der Migration,
die man mit `prisma migrate dev --create-only` erzeugt und dann ergänzt:

| Migration | Von Hand ergänzt |
| --- | --- |
| `20261006130221_init` | Wochennummer 1 bis 53, Person: Azubi braucht Ausbilder und Beginn, Ende nach Beginn, nicht sein eigener Ausbilder, Trigger `status_change_immutable` und `weekly_report_delete_guard`, Einzeilen-Tabelle `setting` |
| `20261006150000_account_binding` | Konto-ID darf leer sein (eindeutig, sobald gesetzt), nie leer; E-Mail klein geschrieben (`person_email_normalized`) |
| `20261007090000_einreichen_pruefen` | Prüfrunde und Reihenfolge `seq`; `comment_immutable`; `report_day_locked` (Schreibschutz der Tage); Kommentare nie leer |
| `20261008090000_benachrichtigungen`, `20261008100000_erinnerung_nachholen` | Ausgangskorb (eindeutig je Ereignis, Empfänger, Kanal), Index offener Versandaufträge, Kanal App gilt als zugestellt, `reminder_run` |
| `20261012090000_darstellung`, `20261012110000_feiertag_vorbelegt` | Darstellung am Konto; Merker `holiday_preset` am Tag |
| `20261012100000_kw53_nur_in_langen_jahren`, `20261013100000_erinnerungslauf_wochennummer` | KW 53 nur in Jahren mit 53 Wochen; Wochennummer des Erinnerungslaufs 1 bis 53 |
| `20261013090000_historie_fehlercode` | SQLSTATE `BH803` für die Schranken der Historie |

Wer aus der Spec baut, muss die Namen der Migrationen nicht übernehmen, wohl aber jede der Schranken (Constraints, Trigger,
Indizes) und die festen Codes. P00 und die Playbooks P02 bis P08 sagen, wann welche Schranke entsteht.

Nachweis zu AK-505 (Schreibschutz) und AK-508 (Gleichzeitigkeit): Abschnitt „Nachweis AK-505 und AK-508“ am Ende dieses
Profils.

## 4. Tests und Prüf-Adapter

**Namen.** Jeder Test zu einem Akzeptanzkriterium beginnt mit der AK-ID im Namen, z. B.
`AK-102 abgewiesenes Konto sieht Hinweis` (`CLAUDE.md`). Prüffälle laufen unter ihrer Prüffall-ID.

| Ebene | Runner | Befehl | Datenbank |
| --- | --- | --- | --- |
| Fachlogik (reine Funktionen) | `tests/pruefung/fachlogik.test.ts` mit Adapter `tests/pruefung/adapter.ts` | `npm run test:unit` | nein |
| Daten (Regeln am gespeicherten Bestand) | `tests/pruefung/daten.test.ts` mit `tests/pruefung/daten-adapter.ts` | `npm run test:db` | ja, `TEST_DATABASE_URL` |
| Ablauf (Browser) | `e2e/pruefung-ablauf.spec.ts` mit `e2e/pruefung/ablauf-adapter.ts`, Elementen in `e2e/pruefung/ablauf-pruefungen.ts` und Testgrenzen in `e2e/pruefung/testgrenzen.ts` | `npm run test:e2e` | die laufende App |

- **Lader.** `tests/pruefung/cases.ts` liest alle Dateien `specs/pruefung/*.json` außer `testdaten.json`. Jeder Fall läuft in
  genau einem Runner. Eine Ebene ohne Runner lässt den Test scheitern; stilles Überspringen gibt es nicht.
- **Fachlogik-Adapter.** `call(schnittstelle, eingabe)` bildet jeden Namen aus den Schnittstellentabellen in
  `specs/pruefung/format.md` auf eine Funktion unter `src/domain/` ab und wandelt Formate (Kalendertag, Zeitpunkt, Woche
  `JJJJ-Www`) um. Ein Fall mit `uhr` stellt die Uhr mit `setFixedNow()`; nach jedem Fall `resetClock()`.
- **Daten-Adapter.** Vor jedem Fall wird die Test-Datenbank geleert (`resetDatabase` in `tests/db/helpers.ts`, über das
  Löschen der Personen mit Kaskade, weil die Historie nicht anders löschbar ist), der Ausgangsbestand nach `format.md`
  hergestellt und jeder Schritt über dieselben Funktionen aufgerufen wie die Serveraktionen. Schreibversuche an der
  Historie (`historie_aendern`, `historie_loeschen`, `bericht_loeschen`) gehen direkt über den Prisma-Client, damit die
  Trigger geprüft werden.
- **Ablauf-Adapter.** Übersetzt Aktionen in Klicks und liest nur feste Merker, nie Meldungstexte (Ausnahme: der Seitentitel,
  M09-R22). Uhr und Bestand stellt die Testschnittstelle `src/app/api/test/zustand/route.ts`.
- **Weitere Tests.** Vitest neben dem Code (`src/domain/*.test.ts` u. a.), Datenbanktests unter `tests/db/`, Playwright je
  Modul unter `e2e/` (Dateinamen mit AK-Bereich, z. B. `e2e/ak-501-803-einreichen-pruefen.spec.ts`), dazu
  `e2e/barrierefreiheit.spec.ts` (axe, UI-AK-16), `e2e/ui-ak.spec.ts`, `e2e/beispielszenarien.spec.ts`.
- **Abdeckung.** `npm run ak:abdeckung -- --pruefen` verlangt zu jeder AK-ID mindestens einen Test mit der ID im Namen;
  `docs/03-testabdeckung.md` wird davon erzeugt.
- **Daten.** Nur Testdaten aus `specs/pruefung/testdaten.json` (Anna, Bernd, Clara; Dora und Emil für die Fälle ohne
  Eintrag). Der Seed `prisma/seed.ts` legt sie idempotent an, mit Annas Beispielbericht KW 40/2026.

## 5. Lokaler Start, Cloud-Sitzung und CI

**Umgebungsvariablen** stehen mit Demo-Werten in `.env.example` und gelten nur lokal: Datenbank (`DATABASE_URL`,
`TEST_DATABASE_URL`), App (`APP_URL`, `TZ=Europe/Berlin`), Anmeldung (`AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`,
`AUTH_OIDC_ISSUER`, `AUTH_OIDC_INTERNAL_ISSUER`, `AUTH_OIDC_CLIENT_ID`, `AUTH_OIDC_CLIENT_SECRET`,
`AUTH_OIDC_ACCOUNT_ID_CLAIM`, `AUTH_OIDC_EMAIL_CLAIM`, `AUTH_OIDC_EMAIL_VERIFIED_CLAIM`, `AUTH_OIDC_NAME`,
`AUTH_TEST_LOGIN`), Uhr (`APP_FIXED_NOW`), Benachrichtigungen (`SMTP_*`, `TEAMS_MODE`, `TEAMS_GRAPH_*`,
`NOTIFICATION_POLL_SECONDS`, `NOTIFICATION_MAX_ATTEMPTS`) und Compose (Ports, Keycloak-Admin). Keine Geheimnisse
einchecken; das Repository ist öffentlich.

**Cloud-Sitzung (Claude Code im Web).** Das Startskript `.claude/hooks/session-start.sh` startet PostgreSQL 16, legt Rolle
`berichtsheft` und die Datenbanken `berichtsheft` und `berichtsheft_test` an, kopiert `.env.example` nach `.env`, führt
`npm ci` aus und danach Migration und Seed (Protokoll `/tmp/session-start.log`). Container (Docker Compose, Image-Bau) laufen
in der Sandbox nicht; alles läuft nativ:

| Aufgabe | Befehl |
| --- | --- |
| Lint, Format, Typecheck | `npm run lint`, `npm run format:check`, `npm run typecheck` |
| Vitest | `npm test` (Fachlogik, PDF, Datenbank) |
| Browser-Tests lokal | `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375` (startet `next dev` mit Test-Login, ohne Keycloak) |
| Echter OIDC-Login (selten) | Keycloak aus dem Release-Archiv mit `keycloak/realm-berichtsheft.json`, App als Produktions-Build (`npm run build`, dann `NODE_ENV=production sh docker/start-app.sh`), danach `E2E_LOGIN_MODE=keycloak npm run test:e2e` |

**Nur in CI (GitHub Actions) prüfbar:** Firefox und Microsoft Edge (AK-1101), der vollständige Compose-Stack mit Keycloak,
Mailpit und Healthchecks, Image-Bau, axe-Lauf und Screenshots im Compose-Betrieb. In der Cloud-Sitzung ist nur Chromium
installiert (`PLAYWRIGHT_BROWSERS_PATH`), nie `playwright install` aufrufen. Jeder Firefox-Befund kostet einen vollen
CI-Lauf: Diagnosemeldungen früh einbauen. Im PR vermerken, was nur CI prüft.

**CI** (`.github/workflows/ci.yml`, Regeln `docs/ci-richtlinie.md`): erst lokal alles grün, gebündelt pushen, den Draft-PR erst
auf „bereit“ setzen, wenn lokal alles grün ist. Jobs: Umfang, Lint/Format/Typecheck/Vitest/AK-Abdeckung/Landkarte,
Docker Compose mit Playwright (Chromium, Firefox, Edge, 375 px, axe, Screenshots). Logs und Artefakte enthalten nur Testdaten,
Workflows nutzen keine Geheimnisse.

## 6. Bewusste Abweichungen

Die TypeScript-App ist die Referenz und hat **keine** Abweichung von einer Fach-Spec; kein Prüffall trägt `abweichend` für
`typescript`. Folgende Auslegungen des Profils sind trotzdem festzuhalten:

| Stelle | Auslegung | Begründung |
| --- | --- | --- |
| Testgrenze AK-408-03 | Der Fall läuft in Firefox nicht (Q-R06, `e2e/pruefung/testgrenzen.ts`); in Firefox belegt AK-408-05 dieselbe Regel | Playwright kann das Neuladen mit bestätigtem Dialog in Firefox nicht treu nachstellen; Freigabe Chris, 13.10.2026; in G5 erneut prüfen |
| Test-Login | Anmeldeweg „Werkzeug des Runners“, nur außerhalb von `NODE_ENV=production` | Ablauf-Fälle brauchen eine Anmeldung ohne Identity Provider; zählt nicht zu den `anmeldewege` der Seite (`format.md`) |
| Teams | Im Demobetrieb ein Postfach in der Datenbank statt Microsoft Graph | Graph wird bei der Übernahme mit der IT geklärt (M08, Abschnitt 8) |
| Zuordnung der Nachweise | Die Aufgabe „Historie unveränderlich“ gehört zu AK-803 (M06); der Schreibschutz der Tage zu AK-505 (M05). Der Nachweis unten führt beides | siehe Bitte bestätigen |

## 7. Fallstricke und Grenzen

- **Uhr.** „Jetzt“ kommt ausschließlich aus `src/domain/clock.ts` (`now()`), nie aus `new Date()` oder einem
  Datenbank-Default in Fachlogik, Serveraktionen und Worker. Aufrufer reichen „jetzt“ als Parameter hinein. Die gestellte Uhr
  liegt auf `globalThis`, damit Seiten, Route-Handler und Serveraktionen dieselbe sehen. `APP_FIXED_NOW` wirkt nur außerhalb
  von `NODE_ENV=production`.
- **Datenbank in UTC.** Verbindungen nur über `createPrismaClient` in `src/lib/db.ts`: Sie laufen fest in UTC, weil
  `@prisma/adapter-pg` `timestamptz` bei einem Server in Europe/Berlin sonst verschoben liest. Nach einem Update eine bestehende
  Demo-Datenbank einmal mit `docker compose down -v` zurücksetzen. Angezeigt wird in Europe/Berlin. Kalendertage sind `Date`
  auf UTC-Mitternacht und werden nur mit `getUTC…()` gelesen.
- **Rolle und Besitz.** Jede Serveraktion und jeder Route-Handler prüft Rolle und Besitz selbst; Ausblenden in der Oberfläche
  ist kein Schutz. Sitzungen sind JWT ohne Widerruf; dass eine Deaktivierung sofort wirkt, hängt allein an
  `getCurrentPerson()`, das bei jeder Anfrage die Datenbank liest.
- **Geschützte Pfade** (AM-R04): `src/auth.ts`, `src/proxy.ts`, `src/lib/auth/`, `src/domain/access.ts`,
  `src/domain/report-access.ts` ändert nur Chris frei. Im Blindtest gilt das nicht (Steuerung, Abschnitt 12).
- **Prisma-Client.** `npm ci` ruft `prisma generate` (postinstall) und braucht dafür `prisma/schema.prisma`; in einem frischen
  Worktree vor Typecheck und Tests `npx prisma generate`. Fehlt das Schema (Aufbau aus der Spec), zuerst das Schema anlegen
  oder `npm ci --ignore-scripts` und danach `npx prisma generate`. Auch das Startskript scheitert in diesem Zustand bei
  `db:migrate`; P00 beschreibt die Reihenfolge.
- **Next.js 16.** Die Datei für das Rücksprungziel heißt `src/proxy.ts` (früher `middleware.ts`). `params` und `searchParams` der
  Seiten sind Promises. Serverseitige Eingaben (Formulare) kommen als `FormData`; Browser senden Zeilenumbrüche als `\r\n`, die
  Fachlogik speichert `\n`.
- **Serialisierbare Transaktionen** (Personenverwaltung) können mit `P2034` oder `TransactionWriteConflict` scheitern; bis zu
  fünf Versuche, sonst verliert AK-207 den letzten aktiven Ausbilder.
- **Genau einmal** (M08) hängt an zwei Stellen: Unique-Index (Ereignis, Empfänger, Kanal) mit `skipDuplicates` beim Anlegen und
  `SKIP LOCKED` beim Versand. Wer nur eine nachbaut, verliert AK-1004.
- **Merker der Oberfläche.** Die Ablauf-Fälle lesen feste Merker (`data-woche`, `data-fehler`, `data-ungespeichert`,
  `data-anmeldeweg` u. a., Liste in `specs/code-landkarte.md`, Abschnitt M09). Wer sie umbenennt, bricht die Ablauf-Fälle. Die
  Felder von „Woche erfassen“ sind gesperrt, bis die Seite interaktiv ist (`src/components/ui/use-hydrated.ts`); Browser-Tests
  warten darauf.
- **Farbschema auf dem Server.** Konto vor Cookie, beim ersten Rendern gesetzt; eine rein clientseitige Lösung bricht UI-AK-15.
- **Grenzen.** Firefox, Edge und der Compose-Stack nur in CI (Abschnitt 5). Das Teams-Postfach ist nur für die Demo. Eine
  Mehrmandantenfähigkeit gibt es nicht: genau eine Firma, eine `setting`-Zeile.
- **Keine Geheimnisse, nur Testdaten** (Anna, Bernd, Clara, Dora, Emil) in Code, Tests, Logs und Artefakten.

## Nachweis AK-505 und AK-508

Zu Abschnitt 3 („Historie unveränderlich“ und „Transaktion und Gleichzeitigkeit“). Zuordnung: AK-505 (M05) ist der Schreibschutz
eingereichter und freigegebener Berichte, die Unveränderlichkeit der Historie ist AK-803 (M06); beide Schranken arbeiten mit
Datenbank-Triggern und stehen hier nebeneinander. Die Tests liegen in der Referenz-Umsetzung; wer aus der Spec baut, schreibt
sie nach demselben Muster.

### AK-505: Schreibschutz in der Datenhaltung (zweite Schranke)

| Teil | Umsetzung |
| --- | --- |
| Regel | M05-R08, M05-R09: Nach dem Einreichen ist der Bericht „Eingereicht“ und für den Azubi schreibgeschützt; die Datenhaltung weist Änderungen an den Tagen auch an der Fachlogik vorbei ab (M05, Abschnitt 8) |
| Erste Schranke | `canEditReport()` in `src/domain/report-access.ts` und die Statusprüfung in `saveReportDays()` (`src/lib/reports.ts`) liefern `not-editable` |
| Trigger | `report_day_locked` (Funktion und Trigger `BEFORE UPDATE ON "report_day"`): wirft eine Ausnahme, wenn der Bericht den Status `SUBMITTED` oder `APPROVED` hat |
| Migration | `prisma/migrations/20261007090000_einreichen_pruefen/migration.sql` |
| Fehlergrund | Server: `reason` `not-editable`; Datenbank: SQLSTATE `P0001` mit Text „… schreibgeschützt …“ (der Schreibschutz der Tage trägt, anders als die Historie, keinen eigenen Code) |
| Einreichen speichert mit | `transitionReport()` speichert die Tageseingaben in derselben Transaktion; scheitert danach nur die Pflichtprüfung, endet die Transaktion regulär und die Eingaben bleiben als Entwurf (Rollback an dieser Stelle verletzt AK-505) |
| Vitest, Datenbank | `tests/db/transitions.test.ts`: „AK-505 nach dem Einreichen ist der Bericht für den Azubi schreibgeschützt (Server und Datenbank)“ (Server weist ab, direkter Prisma-Update wirft `/schreibgeschützt/`); weitere Fälle im Block „Einreichen (AK-501 – AK-505)“ |
| Vitest, Fachlogik | `src/domain/report-access.test.ts` (Bearbeitbarkeit nach Status) |
| Prüffälle | `specs/pruefung/M05.json`: AK-505-01 bis AK-505-04 (Ebene `daten`), AK-505-05 bis AK-505-07 (Ebene `fachlogik`), ausgeführt von `tests/pruefung/daten.test.ts` und `tests/pruefung/fachlogik.test.ts` |
| Playwright | `e2e/ak-501-803-einreichen-pruefen.spec.ts`: „AK-505 AK-506 AK-601 einreichen, Prüfliste mit Filter, zurückziehen“ |

### AK-803: Historie unveränderlich (Datenbank-Trigger)

| Teil | Umsetzung |
| --- | --- |
| Regel | M06-R08 bis M06-R11: Statuswechsel und Kommentare lassen sich weder ändern noch löschen; ein Bericht mit Historie ist nicht einzeln löschbar; nur das endgültige Löschen der Person entfernt sie per Kaskade |
| Trigger | `status_change_no_update`, `status_change_no_delete` (Funktion `status_change_immutable`), `comment_no_update`, `comment_no_delete` (Funktion `comment_immutable`), `weekly_report_delete_guard` (BEFORE DELETE auf `weekly_report`) |
| Kaskade | DELETE ist nur zulässig, wenn es aus dem Löschen des Berichts kommt (`pg_trigger_depth() > 1`) und der Bericht nicht mehr existiert; der Bericht selbst ist geschützt, solange seine Person existiert |
| Migrationen | `prisma/migrations/20261006130221_init/migration.sql` (Statuswechsel, Löschschutz), `prisma/migrations/20261007090000_einreichen_pruefen/migration.sql` (Kommentare), `prisma/migrations/20261013090000_historie_fehlercode/migration.sql` (fester Code) |
| Fehlergrund | SQLSTATE `BH803` (Funktionen mit `USING ERRCODE = 'BH803'`); `isHistoryImmutableError()` in `src/lib/history-guard.ts` liest ihn unter `meta.driverAdapterError.cause.originalCode` der Prisma-Fehlerform; Prüffall-Code `historie_unveraenderlich` |
| Vitest, Datenbank | `tests/db/status-change.test.ts`: „AK-803 Statuswechsel-Eintrag kann nicht geändert werden“, „… nicht gelöscht werden“, „Wochenbericht mit Historie lässt sich nicht einzeln löschen“, „endgültiges Löschen der Person entfernt Berichte und Historie per Kaskade“, „Abweisungen der Historie tragen den festen Code, unabhängig vom Meldungstext“, „Löschen einer Person mit Einträgen in fremder Historie scheitert“; `tests/db/transitions.test.ts` (Block „Historie (AK-801 – AK-803)“, Kommentare) |
| Prüffälle | `specs/pruefung/M06.json`: AK-803-01 bis AK-803-05 (Ebene `daten`) |

### AK-508: Gleichzeitigkeit (bedingtes Update mit Version)

| Teil | Umsetzung |
| --- | --- |
| Regel | M05-R20, M05-R21: Zieht der Azubi zurück, während ein Ausbilder prüft, scheitert dessen Prüfung mit „Bericht wurde zurückgezogen“; umgekehrt scheitert das Zurückziehen nach der Prüfung |
| Versionsstand | Spalte `version` an `weekly_report` (Anfang 0, plus 1 bei jedem Statuswechsel); jede Aktion bringt den gesehenen Stand (`SeenState`: Status und Version) aus dem Formular mit |
| Bedingtes Update | `tx.weeklyReport.updateMany({ where: { id, status: von, version: gesehen }, data: { status: nach, version: { increment: 1 } } })` in `transitionReport()` (`src/lib/report-transitions.ts`); zählt das Update 0 Zeilen, hat ein gleichzeitiger Wechsel gewonnen |
| Sperre | davor `SELECT 1 FROM weekly_report WHERE id = … FOR UPDATE` in derselben Transaktion: gleichzeitige Wechsel und Speichern (`saveReportDays()`) warten, der gelesene Stand ist der aktuelle |
| Entscheidung | `decideTransition()` in `src/domain/report-status.ts` vergleicht gesehenen und aktuellen Stand in der Reihenfolge M05-R21; bei 0 Zeilen entscheidet die Funktion mit dem aktuellen Stand neu, damit die Meldung stimmt |
| Fehlergründe | Code (`reason`): `withdrawn-meanwhile` („Bericht wurde zurückgezogen“), `reviewed-meanwhile` („Bericht wurde bereits geprüft und kann nicht mehr zurückgezogen werden.“), `already-submitted`, `already-withdrawn`, `already-revoked`, `changed-meanwhile` (gleicher Status, aber neuer Versionsstand). Prüffall-Codes nach M05-R20: `bericht_zurueckgezogen`, `bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`, `bereits_zurueckgenommen`, `inzwischen_geaendert` |
| Vitest, Datenbank | `tests/db/transitions.test.ts`, Block „Gleichzeitigkeit (AK-508)“: „AK-508 Zurückziehen und Freigeben gleichzeitig: genau einer gewinnt, der andere scheitert mit Meldung“ (`Promise.all`, fünf Durchläufe, je genau ein Historieneintrag pro Wechsel), „Azubi hat zurückgezogen, während der Ausbilder den Bericht offen hatte: Freigabe und Ablehnung scheitern“, „umgekehrt: Zurückziehen scheitert mit Meldung, wenn schon geprüft wurde“, „zurückgezogen und erneut eingereicht: die alte Ansicht des Ausbilders ist veraltet“ |
| Vitest, Fachlogik | `src/domain/report-status.test.ts`, Block „Gleichzeitigkeit (AK-508)“: vier Tests (zurückgezogen, bereits geprüft, zwei Ausbilder, neue Version bei gleichem Status) |
| Prüffälle | `specs/pruefung/M05.json`: AK-508-01 bis AK-508-05 (Ebene `daten`, mit `gesehen` nachgestellt), AK-508-06 bis AK-508-11 (Ebene `fachlogik`) |
| Playwright | `e2e/ak-501-803-einreichen-pruefen.spec.ts`: „AK-508 Zurückziehen während der Ausbilder den Bericht offen hat; umgekehrt Zurückziehen nach der Prüfung“ (zwei Browser) |

**Eine Plattform ohne Versionsstand verliert AK-508.** Wer baut, prüft, dass `version` bei jedem Statuswechsel steigt, dass das
Update bedingt ist und dass die Sperre vor dem Lesen des Stands liegt.

## Bitte bestätigen

- [ ] **Nachweis AK-505:** In der Aufgabe heißt AK-505 „Historie unveränderlich“; nach `specs/M05-status-und-pruefung.md` ist
      AK-505 der Schreibschutz der Tage, die unveränderliche Historie ist AK-803 (`specs/M06-historie.md`). Das Profil weist
      beides nach (AK-505 und AK-803) und führt den Nachweis als eigenen Abschnitt am Ende, weil die Prüfung die sieben Abschnitte
      in fester Reihenfolge verlangt; Abschnitt 3 verweist darauf.
- [ ] **Fehlergründe AK-508:** Die Prüffall-Codes stehen in M05-R20 und sind maßgeblich; die Namen der Gründe im Code
      (`withdrawn-meanwhile` usw.) sind Beispiele der Referenz und für andere Umsetzungen frei wählbar.
- [ ] **Zielstruktur:** Die Dateinamen unter `src/`, `tests/` und `e2e/` sind eine Konvention der Referenz; ein Aufbau aus der
      Spec darf sie wählen, solange die Landkarte-Zuordnung je Modul gleich lesbar bleibt.
