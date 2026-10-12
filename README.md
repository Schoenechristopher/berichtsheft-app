# Berichtsheft-App

Digitales Berichtsheft: Azubis erfassen ihre Wochenberichte (Mo–Fr), Ausbilder prüfen, geben frei oder lehnen mit Kommentar ab.

**Status: Etappe 8 – neu gestaltete Oberfläche.** Alle 74 Akzeptanzkriterien und die 20 UI-Akzeptanzkriterien sind mit benannten Tests belegt, die App ist in Chromium, Firefox und Microsoft Edge sowie bei 375 px Smartphone-Breite getestet, dazu automatisch mit axe auf WCAG 2.2 AA (hell und dunkel).

| Dokument | Inhalt |
| --- | --- |
| [Spezifikation und Akzeptanzkriterien](docs/01-spezifikation.md) | was die App können muss (AK-101 … AK-1102), Beispielszenarien |
| [Plan: Technik und Hosting](docs/02-plan.md) | Technik, Datenmodell, Etappen, Übernahme in die Firmeninfrastruktur |
| [Testabdeckung](docs/03-testabdeckung.md) | jedes Akzeptanzkriterium mit seinen Tests und der Testebene (erzeugt mit `npm run ak:abdeckung`) |
| [Demo-Anleitung](docs/04-demo-anleitung.md) | Start, Testkonten und ein Vorführ-Drehbuch von ca. 15 Minuten |
| [UI-Spezifikation](docs/05-ui-spezifikation.md) | Gestaltung der Oberfläche: Design-Tokens (Petrol, hell/dunkel), Komponenten, Navigation, Seiten, Barrierefreiheit, UI-AK-01 … UI-AK-20 |
| [CI-Richtlinie](docs/ci-richtlinie.md) | Budget und Regeln für GitHub Actions |

Aufträge der Etappen: [1](AUFTRAG-ETAPPE-1.md), [2](AUFTRAG-ETAPPE-2.md), [3](AUFTRAG-ETAPPE-3.md), [4](AUFTRAG-ETAPPE-4.md), [5](AUFTRAG-ETAPPE-5.md), [6](AUFTRAG-ETAPPE-6.md), [7](AUFTRAG-ETAPPE-7.md), [8](AUFTRAG-ETAPPE-8.md).

## Funktionen im Überblick

- **Anmeldung** ausschließlich über das Firmenkonto (Demo: Keycloak, später Microsoft Entra ID); nur Personen, die ein Ausbilder angelegt hat, erhalten Zugang.
- **Nutzerverwaltung** für Ausbilder: Personen anlegen, Rollen, Zuordnung Azubi → Ausbilder, Ausbildungszeitraum, Bundesland der Firma, deaktivieren, wieder aktivieren, endgültig löschen.
- **Wochenberichte** entstehen automatisch ab Ausbildungsbeginn, Feiertage sind vorbelegt; pro Tag Tagesart und Tätigkeiten, Entwürfe speichern, Warnung bei ungespeicherten Änderungen. Die Übersicht hebt vergangene offene Wochen hervor.
- **Einreichen und Prüfen:** Pflichtfelder werden geprüft und am Tag markiert; Zurückziehen vor der Prüfung; Prüfliste mit Filter, Freigabe, Ablehnung mit Gesamt- und Tageskommentaren, Rücknahme einer Freigabe mit Begründung – auch durch eine Vertretung. Jeder Bericht zeigt seine unveränderliche Historie nach Prüfrunden.
- **PDF-Export** einer Woche oder eines frei wählbaren Zeitraums, mit Freigabevermerk bzw. Kennzeichnung „Nicht freigegeben“.
- **Benachrichtigungen** per E-Mail, Teams (in der Demo simuliert) und in der App (Glocke mit Zähler), Kanäle wählt jede Person selbst; montags um 9:00 Uhr Erinnerung an offene Wochen und Information des Ausbilders bei überfälligen. Nicht zustellbare Nachrichten sehen Ausbilder unter „Nicht zustellbar“.
- **Oberfläche** nach der [UI-Spezifikation](docs/05-ui-spezifikation.md): Seitenleiste (darunter Burger-Menü), Startseite mit der aktuellen Woche und „Zu erledigen“, Woche erfassen mit fünf Spalten ab 1280 px, geteilte Prüfansicht, Darstellung „System / Hell / Dunkel“ am Konto, WCAG 2.2 AA. Schrift IBM Plex Sans, lokal gebündelt (`src/app/fonts/`).
- **Mobil bedienbar:** alle Funktionen bei 375 px Breite ohne seitliches Scrollen.

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
| `emil` | `emil` | Firmenkonto `emil@berichtsheft.test`, in der App erst nach dem Anlegen durch einen Ausbilder; der erste Login verknüpft das Konto |

Benachrichtigungen ausprobieren: Reicht Anna eine Woche ein, zeigt die Glocke bei Bernd einen Zähler; die E-Mail steht nach wenigen Sekunden in Mailpit (<http://localhost:8025>). Wer unter „Einstellungen“ den Kanal „Teams“ wählt, findet die Nachricht im „Teams-Postfach (Demo)“ (Seitenleiste bzw. Burger-Menü). Links in Nachrichten führen nach der Anmeldung direkt zum Bericht.

Eine Schritt-für-Schritt-Vorführung steht in der [Demo-Anleitung](docs/04-demo-anleitung.md).

Ausprobieren: als `anna` anmelden – die Startseite zeigt die aktuelle Woche und unter „Zu erledigen“ die offenen Wochen, „Meine Wochen“ alle Wochen seit dem 01.09.2026 (KW 40 mit Beispielinhalt); eine Woche öffnen, Tagesart und Tätigkeiten erfassen, „Speichern“. Als `bernd` oder `clara` erscheinen Annas Wochen unter „Azubis“ und auf der Startseite. Reicht Anna eine Woche ein („Einreichen …“), steht sie in Bernds „Prüfliste“ (Clara sieht sie unter „Alle Azubis“); ab 1024 px links die Liste, rechts der Bericht, dort freigeben oder mit Kommentar ablehnen – danach öffnet sich der nächste Bericht. „Als PDF herunterladen“ auf der Berichtsseite exportiert die Woche; „Berichtsheft als PDF herunterladen“ im Seitentitel von „Meine Wochen“ (Ausbilder: Wochen eines Azubis) exportiert einen Zeitraum.

Neue Person: als `bernd` unter „Personen“ → „Person anlegen“ Emil Neu mit `emil@berichtsheft.test` anlegen (Rolle Azubi, Ausbilder, Beginn), dann in einem privaten Fenster als `emil` anmelden.

### Adressen

| Dienst | Adresse | Zugang |
| --- | --- | --- |
| Berichtsheft-App | <http://localhost:3000> | Testkonten oben |
| Keycloak (Test-Login) | <http://localhost:8080> | Admin-Konsole: `admin` / `admin` |
| Mailpit (abgefangene E-Mails) | <http://localhost:8025> | – |
| Teams-Postfach (Demo, simulierter Kanal „Teams“) | <http://localhost:3000/entwickler-postfach> | angemeldet; Azubis sehen eigene, Ausbilder alle Nachrichten |

Beenden mit `Strg+C` bzw. `docker compose down`; `docker compose down -v` löscht zusätzlich die Datenbank.

**Einmalig nach dem Update auf die Zeitzonen-Korrektur:** Eine bereits bestehende Demo-Datenbank bitte einmal mit `docker compose down -v` zurücksetzen. Die App liest und schreibt Zeitstempel jetzt immer in UTC; in älteren Demo-Daten wären Zeitpunkte (z. B. Freigaben) sonst um eine bzw. zwei Stunden verschoben.

## Aufbau

| Dienst | Aufgabe |
| --- | --- |
| `app` | Next.js-App; wendet beim Start die Migrationen an und legt die Testdaten an (idempotent) |
| `worker` | pg-boss-Worker: erzeugt täglich um 0:05 Uhr (Europe/Berlin) und beim Start fehlende Wochenberichte, schreibt montags um 9:00 Uhr Erinnerungen (verpasst: Nachholen bis Dienstag 23:59 Uhr) und versendet alle 5 s die Outbox (E-Mail an Mailpit, Teams ins Entwickler-Postfach) |
| `db` | PostgreSQL 16 |
| `keycloak` | OIDC-Identity-Provider mit Realm `berichtsheft` (`keycloak/realm-berichtsheft.json`) |
| `mailpit` | fängt alle E-Mails ab |

- Fachregeln liegen als reine Funktionen in `src/domain/`; „jetzt“ kommt nur aus dem Uhr-Modul `src/domain/clock.ts`.
- Datenmodell: `prisma/schema.prisma`, Migrationen in `prisma/migrations/`. Jede Datenbankverbindung läuft in UTC (`createPrismaClient` in `src/lib/db.ts`), unabhängig von der Zeitzone des Datenbank-Servers. Die Historie (`status_change`) ist per Datenbank-Trigger unveränderlich.
- Anmeldung: Auth.js mit OpenID Connect (`src/auth.ts`). Personen werden über die stabile Konto-ID (`sub`, bei Entra ID `oid`) zugeordnet, nicht über Namen. Neu angelegte Personen haben noch keine Konto-ID; der erste Login ordnet sie über die vom Identity Provider bestätigte E-Mail zu und speichert die Konto-ID (`src/lib/auth/login.ts`). Für Microsoft Entra ID werden nur Umgebungsvariablen getauscht (`AUTH_OIDC_*`, siehe `.env.example`).
- Wochenberichte: Erzeugung, Feiertage und Hervorhebung als reine Funktionen in `src/domain/report-generation.ts` und `src/domain/holidays.ts` (feiertagejs), Regeln zum Erfassen in `src/domain/report-days.ts`, Server-Teil in `src/lib/reports.ts`. Berichte entstehen beim Öffnen der Übersicht und täglich im Worker; die Eindeutigkeit pro Azubi und Woche verhindert Doppelte. Erfassen unter `/berichte/[id]`, Übersicht unter `/azubi`, für Ausbilder `/ausbilder/azubis/[id]`.
- Einreichen und Prüfen: Statusmodell (`decideTransition`) in `src/domain/report-status.ts`, Pflichtfelder in `src/domain/report-submission.ts`, Historie nach Prüfrunden in `src/domain/report-history.ts`. Jeder Statuswechsel läuft über `transitionReport` in `src/lib/report-transitions.ts`: Rolle und Besitz prüfen, bedingtes Update auf Status und Version (Gleichzeitigkeit), Historieneintrag und Kommentare in derselben Transaktion; dort hängt Etappe 6 die Benachrichtigungen ein. Kommentare und Statuswechsel sind per Datenbank-Trigger unveränderlich, Tage eingereichter und freigegebener Berichte schreibgeschützt. Prüfliste unter `/ausbilder/pruefliste`.
- PDF-Export: Was gedruckt wird (Wochen eines Zeitraums, Freigabevermerk bzw. Kennzeichnung, Dateiname) entscheiden reine Funktionen in `src/domain/report-pdf.ts`; das Layout ist eine eigene Einheit in `src/pdf/` (@react-pdf/renderer, Daten rein → PDF raus), Laden und Zugriffsprüfung in `src/lib/report-export.ts`. Routen: `/berichte/[id]/pdf` (Woche) und `/azubis/[id]/pdf?von=JJJJ-MM-TT&bis=JJJJ-MM-TT` (Zeitraum). Das PDF entsteht bei jedem Aufruf neu (kein Zwischenspeicher). Schrift: Noto Sans unter `assets/fonts/` (SIL Open Font License), eingebettet, ohne Internetzugriff.
- Benachrichtigungen: Wer bei welchem Ereignis was über welchen Kanal bekommt (Statuswechsel, Erinnerung montags 9:00 Uhr), entscheiden reine Funktionen in `src/domain/notifications.ts`. Der Statuswechsel schreibt sie in derselben Transaktion in die Outbox (Tabelle `notification`, eine Zeile pro Ereignis, Empfänger und Kanal); der Worker versendet E-Mail und Teams über Adapter (`src/lib/notifications/`: `adapters.ts`, `outbox.ts` mit `FOR NO KEY UPDATE SKIP LOCKED`, Wiederholung mit Wartezeit, feste Message-ID). Kanal „App“: Glocke mit Zähler in der Kopfzeile, Liste unter `/benachrichtigungen`. Eigene Kanäle unter „Einstellungen“ (`/einstellungen`, Ausbilder `/ausbilder/einstellungen`). Konfiguration: `APP_URL` (Links), `SMTP_*`, `TEAMS_MODE` (`entwickler-postfach` oder bei der Übernahme `graph`), siehe `.env.example`. Ohne Sitzung leitet jede Seite mit Rücksprungziel zur Anmeldung (`src/proxy.ts`, `/anmelden?ziel=…`).
- Nutzerverwaltung: Regeln in `src/domain/people.ts`, Zugriffsregeln für Berichte in `src/domain/report-access.ts`, serverseitige Durchsetzung in `src/lib/people/service.ts`; Seiten unter `/ausbilder/personen` und `/ausbilder/einstellungen`.

## Entwicklung

Voraussetzung: Node.js 22.

```bash
npm ci
cp .env.example .env
docker compose up -d db keycloak mailpit   # nur die Hilfsdienste
npm run db:migrate && npm run db:seed
npm run dev                                 # http://localhost:3000
npm run worker                              # optional, eigener Prozess (Erinnerung, Versand der Outbox)
```

Ohne Keycloak (z. B. wenn das Image nicht geladen werden kann): in `.env` `AUTH_TEST_LOGIN=true` setzen. Dann bietet die Anmeldeseite einen Test-Login für die Testkonten an. Er ist bei `NODE_ENV=production` immer abgeschaltet.

### Tests

| Befehl | Prüft |
| --- | --- |
| `npm run lint`, `npm run format:check`, `npm run typecheck` | Codequalität |
| `npm test` | Vitest: Fachlogik und PDF-Layout (`src/**/*.test.ts(x)`; PDFs werden erzeugt und wieder ausgelesen) und Datenbank (`tests/db/`, braucht `TEST_DATABASE_URL`; E-Mail-Versand gegen einen SMTP-Mock in `tests/smtp-mock.ts`) |
| `npm run pdf:beispiel` | erzeugt Beispiel-PDFs aus den Seed-Daten (Einzelwoche mit Freigabevermerk, Sammel-PDF) in `beispiel-pdf/`, ohne Datenbank |
| `APP_FIXED_NOW=2026-10-12T09:00:00+02:00 npm run erinnerung` | löst den Montags-Job (Erinnerung, Information an den Ausbilder) einmal zum angegebenen Zeitpunkt aus und versendet die Nachrichten gleich (E-Mail an Mailpit) |
| `npm run ak:abdeckung` | meldet jede AK-ID der Spezifikation und jede UI-AK-ID der UI-Spezifikation ohne Test und schreibt `docs/03-testabdeckung.md` (CI: `-- --pruefen` scheitert bei fehlendem Test oder veralteter Datei) |
| `npm run test:e2e` | Playwright gegen die laufende Demo (`docker compose up`), Login über Keycloak; Projekte `chromium`, `firefox`, `msedge` (alle Tests) und `smartphone-375` (375 px, `e2e/ak-1102-smartphone.spec.ts`). Browser einmalig installieren: `npx playwright install chromium firefox msedge` |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375` | Playwright mit Test-Login, startet `next dev` selbst (ohne Keycloak); nur mit vorinstalliertem Chromium |
| `npm run test:e2e -- --project=a11y` | Barrierefreiheit (UI-AK-16): axe auf allen Seiten, hell und dunkel, bei 1280 und 375 px (Chromium) |
| `npm run test:e2e -- --project=screenshots` | Screenshots der vier Hauptseiten (Desktop/Handy, hell/dunkel) nach `screenshots/` |
| `E2E_MAILPIT_URL=http://localhost:8025 npm run test:e2e` | zusätzlich E-Mails über die Mailpit-API und das Teams-Postfach prüfen (braucht laufenden Worker und Mailpit; in CI immer an) |

Tests zu Akzeptanzkriterien beginnen mit der AK-ID, z. B. `AK-102 Firmenkonto ohne Eintrag wird mit Hinweis abgewiesen`, bzw. mit der UI-AK-ID, z. B. `UI-AK-07 Fußleiste zeigt ungespeicherte Änderungen …`. Die Beispielszenarien der Spezifikation stehen wörtlich in `e2e/beispielszenarien.spec.ts`, ihre AK-IDs als Tags. GitHub Actions führt bei jedem Push Lint, Typecheck, Vitest und die Prüfung der Testabdeckung aus, startet dann `docker compose up` und lässt Playwright in Chromium, Firefox, Edge und bei 375 px gegen die laufende Demo laufen. Danach laufen axe (Projekt `a11y`) und die Screenshots (Projekt `screenshots`). Die Beispiel-PDFs hängen als Artefakt „beispiel-pdf“, die Screenshots als „screenshots“ (7 Tage) am CI-Lauf.
