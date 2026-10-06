# Berichtsheft-App

Digitales Berichtsheft: Azubis erfassen ihre Wochenberichte (Mo–Fr), Ausbilder prüfen, geben frei oder lehnen mit Kommentar ab.

- [Spezifikation und Akzeptanzkriterien](docs/01-spezifikation.md)
- [Plan: Technik und Hosting](docs/02-plan.md)
- [Auftrag Etappe 1](AUFTRAG-ETAPPE-1.md), [Auftrag Etappe 2](AUFTRAG-ETAPPE-2.md), [Auftrag Etappe 3](AUFTRAG-ETAPPE-3.md), [Auftrag Etappe 4](AUFTRAG-ETAPPE-4.md), [Auftrag Etappe 5](AUFTRAG-ETAPPE-5.md), [Auftrag Etappe 6](AUFTRAG-ETAPPE-6.md)

Status: Etappe 6 (Benachrichtigungen und Erinnerung) – Anmelden und Abmelden über das Firmenkonto; Ausbilder verwalten Personen und das Bundesland; Wochenberichte entstehen automatisch ab Ausbildungsbeginn (Feiertage vorbelegt), Azubis erfassen pro Tag Tagesart und Tätigkeiten und speichern Entwürfe; die Übersicht zeigt alle Wochen mit Status und hebt vergangene offene Wochen hervor. Azubis reichen Berichte ein (Pflichtfelder werden geprüft und am Tag markiert) und ziehen sie zurück; Ausbilder prüfen über die Prüfliste, geben frei, lehnen mit Gesamt- und Tageskommentaren ab oder nehmen eine Freigabe mit Begründung zurück. Jeder Bericht zeigt seine unveränderliche Historie nach Prüfrunden. Jede Woche und jeder frei wählbare Zeitraum lässt sich als PDF herunterladen; freigegebene Wochen tragen den Freigabevermerk, nicht freigegebene sind gekennzeichnet. Einreichen benachrichtigt den zugeordneten Ausbilder, Freigabe, Ablehnung und Rücknahme den Azubi – über die Kanäle, die jede Person unter „Einstellungen“ wählt (E-Mail, Teams, App); die Glocke oben zeigt ungelesene App-Benachrichtigungen. Montags um 9:00 Uhr erinnert die App an offene Wochen und informiert bei überfälligen den zugeordneten Ausbilder.

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

Benachrichtigungen ausprobieren: Reicht Anna eine Woche ein, zeigt die Glocke bei Bernd einen Zähler; die E-Mail steht nach wenigen Sekunden in Mailpit (<http://localhost:8025>). Wer unter „Einstellungen“ den Kanal „Teams“ wählt, findet die Nachricht im „Teams-Postfach (Demo)“ (Menü oben). Links in Nachrichten führen nach der Anmeldung direkt zum Bericht.

Ausprobieren: als `anna` anmelden – die Übersicht zeigt alle Wochen seit dem 01.09.2026 (KW 40 mit Beispielinhalt); eine Woche öffnen, Tagesart und Tätigkeiten erfassen, „Speichern“. Als `bernd` oder `clara` erscheinen Annas Wochen auf der Startseite unter „Wochenberichte der Azubis“. Reicht Anna eine Woche ein („Einreichen“), steht sie in Bernds „Prüfliste“ (Clara sieht sie unter „Alle Azubis“); dort freigeben oder mit Kommentar ablehnen. „Als PDF herunterladen“ auf der Berichtsseite exportiert die Woche; über der Wochenliste (Azubi: Startseite, Ausbilder: Ansicht pro Azubi) lässt sich unter „Berichtsheft als PDF herunterladen“ ein Zeitraum exportieren.

Neue Person: als `bernd` unter „Personen“ → „Person anlegen“ Emil Neu mit `emil@berichtsheft.test` anlegen (Rolle Azubi, Ausbilder, Beginn), dann in einem privaten Fenster als `emil` anmelden.

### Adressen

| Dienst | Adresse | Zugang |
| --- | --- | --- |
| Berichtsheft-App | <http://localhost:3000> | Testkonten oben |
| Keycloak (Test-Login) | <http://localhost:8080> | Admin-Konsole: `admin` / `admin` |
| Mailpit (abgefangene E-Mails) | <http://localhost:8025> | – |
| Teams-Postfach (Demo, simulierter Kanal „Teams“) | <http://localhost:3000/entwickler-postfach> | angemeldet; Azubis sehen eigene, Ausbilder alle Nachrichten |

Beenden mit `Strg+C` bzw. `docker compose down`; `docker compose down -v` löscht zusätzlich die Datenbank.

## Aufbau

| Dienst | Aufgabe |
| --- | --- |
| `app` | Next.js-App; wendet beim Start die Migrationen an und legt die Testdaten an (idempotent) |
| `worker` | pg-boss-Worker: erzeugt täglich um 0:05 Uhr (Europe/Berlin) und beim Start fehlende Wochenberichte, schreibt montags um 9:00 Uhr Erinnerungen und versendet alle 5 s die Outbox (E-Mail an Mailpit, Teams ins Entwickler-Postfach) |
| `db` | PostgreSQL 16 |
| `keycloak` | OIDC-Identity-Provider mit Realm `berichtsheft` (`keycloak/realm-berichtsheft.json`) |
| `mailpit` | fängt alle E-Mails ab |

- Fachregeln liegen als reine Funktionen in `src/domain/`; „jetzt“ kommt nur aus dem Uhr-Modul `src/domain/clock.ts`.
- Datenmodell: `prisma/schema.prisma`, Migrationen in `prisma/migrations/`. Die Historie (`status_change`) ist per Datenbank-Trigger unveränderlich.
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
| `npm run test:e2e` | Playwright gegen die laufende Demo (`docker compose up`), Login über Keycloak |
| `E2E_LOGIN_MODE=test npm run test:e2e` | Playwright mit Test-Login, startet `next dev` selbst (ohne Keycloak) |
| `E2E_MAILPIT_URL=http://localhost:8025 npm run test:e2e` | zusätzlich E-Mails über die Mailpit-API und das Teams-Postfach prüfen (braucht laufenden Worker und Mailpit; in CI immer an) |

Tests zu Akzeptanzkriterien beginnen mit der AK-ID, z. B. `AK-102 Firmenkonto ohne Eintrag wird mit Hinweis abgewiesen`. GitHub Actions führt bei jedem Push Lint, Typecheck und Vitest aus, startet dann `docker compose up` und lässt Playwright gegen die laufende Demo laufen. Die Beispiel-PDFs hängen als Artefakt „beispiel-pdf“ am CI-Lauf.
