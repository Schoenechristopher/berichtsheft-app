# P00 Grundgerüst

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Eine leere App startet, der Prüf-Adapter läuft, die Testdaten sind eingelesen. Fertig, wenn:

1. `npm ci`, `npm run lint` und `npm run format:check` laufen grün; `npm run typecheck` und `npm test` nach Schritt 6 bzw. 8
   (noch ohne Fachcode, mit den Platzhaltertests aus Schritt 8).
2. `npm run dev` startet die App; `GET /api/health` antwortet mit Status 200 und fragt die Datenbank ab.
3. Die Prüf-Runner der drei Ebenen (Fachlogik, Daten, Ablauf) sind angelegt und laden alle Dateien aus `specs/pruefung/`. Sie
   führen die Fälle der Module aus, die gebaut sind (Bau-Stand, Schritt 8); alle anderen Fälle erscheinen sichtbar als „noch
   nicht gebaut“ (`it.todo`), nie still übersprungen. Eine Ebene ohne Runner lässt den Test scheitern.
4. `specs/pruefung/testdaten.json` (Anna, Bernd, Clara, Dora, Emil) ist lesbar und in einem Test geprüft.
5. Das Profil, Abschnitt 3, ist gegen das laufende Gerüst bestätigt (Schritt 11). Die Umsetzung hat keinen Fachcode.

Dieses Playbook gehört keinem Fach-Modul und nennt deshalb keine AK-IDs; ab P01 hängt jedes Playbook an den AK-IDs seines
Moduls.

## 2. Voraussetzungen

- Keine fertigen Playbooks. P00 ist das erste Paket und blockiert alle anderen (`playbooks/00-steuerung.md`, Abschnitt 2).
- Werkzeuge: Node.js ab 22.12, npm, PostgreSQL 16 mit Rolle `berichtsheft` und den Datenbanken `berichtsheft` und
  `berichtsheft_test`. In der Cloud-Sitzung richtet das Startskript `.claude/hooks/session-start.sh` PostgreSQL, `.env`,
  `npm ci`, Migration und Seed ein (Protokoll `/tmp/session-start.log`); es braucht ein vorhandenes `prisma/schema.prisma`,
  siehe Schritt 3.
- Profil: Abschnitte 1, 2, 4, 5 und 7.
- Ein Branch, z. B. `claude/p00-grundgeruest`, und ein Draft-PR (`CLAUDE.md`, „Arbeitsweise“).

## 3. Eingaben

- Profil: `profile/typescript-nextjs.md`, Abschnitte 1 bis 5 und 7.
- Fach-Specs: `specs/00-uebersicht.md` (Module, Lesereihenfolge), `specs/Q-plattform-und-qualitaet.md`, Abschnitt 8
  (Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/format.md` (Aufbau, Adapter-Regeln), `specs/pruefung/testdaten.json`.
- Vorgaben: `CLAUDE.md`, `docs/ci-richtlinie.md`, `docs/02-plan.md` (Technik-Plan).
- Vorhandene Werkzeuge (nicht ändern): `scripts/ak-abdeckung/`, `scripts/code-landkarte/`, `scripts/pruefumfang/`,
  `scripts/playbooks/`, `.github/workflows/ci.yml`, `docker/start-app.sh`.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und nur, wenn der Quellcode der Referenz vorliegt. Lesereihenfolge: `package.json`,
`tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `prisma.config.ts`, `src/lib/db.ts`, `src/app/api/health/route.ts`,
`tests/db/global-setup.ts`, `tests/db/helpers.ts`, `tests/pruefung/cases.ts`, `tests/pruefung/fachlogik.test.ts`,
`tests/pruefung/daten.test.ts`, `e2e/pruefung-ablauf.spec.ts`. Die Konfiguration lässt sich 1:1 übernehmen; die Prüf-Adapter
entstehen in P01 bis P08 Schritt für Schritt.

## 5. Weg B: aus der Spec

Bau-Reihenfolge des Gerüsts:

1. Wurzelordner: `package.json` mit den Skripten aus Profil, Abschnitt 2.3, Konfigurationsdateien nach Abschnitt 2.2.
2. Prisma: `prisma/schema.prisma` (nur Generator und Datasource), `prisma.config.ts`, `src/lib/db.ts` mit
   `createPrismaClient()`.
3. Gesundheitsprüfung `src/app/api/health/route.ts`.
4. Uhr-freie Grundlagen für Tests: `tests/db/global-setup.ts`, `tests/db/helpers.ts` (`testDb()`, `resetDatabase()`).
5. Prüf-Runner: Lader `tests/pruefung/cases.ts`, Runner der Ebenen Fachlogik und Daten, Ablauf-Runner
   `e2e/pruefung-ablauf.spec.ts`, Gerüst von `e2e/pruefung/testgrenzen.ts`.
6. Testdaten-Test `tests/pruefung/testdaten.test.ts`.

Welche Teile schon im Wurzelordner stehen (z. B. `package.json`, `Dockerfile`, `docker-compose.yml`, `.env.example`), steht
im Profil, Abschnitt 2.2; sie werden geprüft, nicht neu erfunden.

Für das Gerüst gibt es keine Akzeptanzkriterien. Die Regeln der Plattform dazu stehen in `specs/Q-plattform-und-qualitaet.md`,
Abschnitt 8 („Prüfbarkeit“: Uhr und Testdaten stellbar, nur außerhalb des Produktivbetriebs; feste Merker statt
Meldungstexten); sie werden in P10 abgenommen.

## 6. Empfehlung

**Weg B.** Das Gerüst ist Konfiguration und hängt an keiner Fachregel; die Schritte unten reichen. Weg A nur, wenn Chris es für
einen Vergleich ausdrücklich beauftragt.

## 7. Schritte

1. **Bestand prüfen.** `ls -a` im Wurzelordner und `git status`. Prüfschritt: Liste der vorhandenen und fehlenden Dateien aus
   Profil, Abschnitt 2.2, notieren. Ist `src/`, `prisma/`, `tests/` oder `e2e/` leer oder fehlt es, ist das der erwartete
   Ausgangspunkt.
2. **Branch anlegen** und, falls `.env` fehlt, `cp .env.example .env`. Prüfschritt: `.env` steht in `.gitignore`
   (`git status` zeigt sie nicht).
3. **Prisma-Schema anlegen, dann installieren.** `prisma/schema.prisma` mit `generator client` (`provider = "prisma-client"`,
   `output = "../src/generated/prisma"`) und `datasource db` (`provider = "postgresql"`), noch ohne Modelle. Erst danach
   `npm ci` (das `postinstall`-Skript ruft `prisma generate` und braucht das Schema; alternativ `npm ci --ignore-scripts` und
   `npx prisma generate`). Prüfschritt: `src/generated/prisma/` entsteht; `src/generated/` steht in `.gitignore`. Auch `scripts/playbooks/pruefen.ts` und die
   Tests unter `scripts/` brauchen den erzeugten Client: vor jedem Prüflauf `npx prisma generate`.
4. **Konfiguration vervollständigen** nach Profil, Abschnitt 2.2 (nur fehlende Dateien). Prüfschritt: `npm run lint` und
   `npm run format:check` laufen durch (`npm run typecheck` erst nach Schritt 6: `next typegen` bricht ohne `src/app` ab).
5. **Datenbankzugang `src/lib/db.ts`.** `createPrismaClient(url)` baut `PrismaClient` mit `@prisma/adapter-pg` (`PrismaPg`) und
   zwingt die Sitzung in UTC (`DB_SESSION_OPTIONS`, Wert `"-c TimeZone=UTC"`, als `options` an `PrismaPg`; der Client wird aus
   `@/generated/prisma/client` importiert); `db()` liefert eine gemeinsame
   Instanz für die App. Dies ist die einzige Stelle für Datenbankverbindungen. Prüfschritt: ein Test lässt die Datenbank mit
   `TZ=Europe/Berlin` einen `timestamptz` schreiben und lesen und erhält denselben Zeitpunkt (der vollständige Test
   `tests/db/timezone.test.ts` entsteht in P06).
6. **Gesundheitsprüfung.** `GET /api/health` führt `SELECT 1` über `db()` aus und antwortet mit 200 und `{ "status": "ok" }`,
   bei Datenbankfehler mit 503. Prüfschritt: `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/health` liefert `200`; jetzt läuft auch
   `npm run typecheck` ohne Fehler.
7. **Test-Hilfen der Datenbank.** `tests/db/global-setup.ts` führt `prisma migrate deploy` gegen `TEST_DATABASE_URL` aus und
   scheitert ohne diese Variable mit einer verständlichen Meldung. `tests/db/helpers.ts` bietet `testDb()` (Client über
   `createPrismaClient`) und `resetDatabase()`. Es leert zuerst die Azubis, dann alle Personen (die Kaskade entfernt Berichte und Historie, die per Trigger
   nicht anders löschbar sind, siehe P06), danach Einstellungen und Erinnerungsvermerke; in P00 ist es leer und wächst mit den
   Modellen von P02 bis P08. Prüfschritt: `npm run test:db` startet, migriert
   (noch nichts) und endet ohne Fehler.
8. **Prüf-Runner anlegen.** `tests/pruefung/cases.ts` liest alle Dateien `specs/pruefung/*.json` außer `testdaten.json`
   (`loadCases()`), kennt die Ebenen und verteilt sie: `daten` an `tests/pruefung/daten.test.ts` (Projekt `db`), `ablauf` an
   `e2e/pruefung-ablauf.spec.ts`, alles Übrige an `tests/pruefung/fachlogik.test.ts`. Jeder Prüffall wird ein Test mit dem Namen
   `<Prüffall-ID> (<Datei>, <Ebene>)`; `assertNoDeviation()` weist `abweichend` für `typescript` ab.
   **Bau-Stand:** `cases.ts` enthält eine Liste der gebauten Module (anfangs leer) und eine Liste zurückgestellter Fälle. Ein
   Fall zählt zum Modul seines Feldes `modul`, die Fälle aus `specs/pruefung/szenarien.json` zum Schlüssel „szenarien“ (P10).
   Fälle ungebauter Module und zurückgestellte Fälle werden `it.todo("<ID> noch nicht gebaut")`, im Ablauf-Runner
   `test.skip` mit demselben Titel. Zurückgestellt sind (sie brauchen Funktionen späterer Module): AK-305-09 bis P04, AK-205-01
   und AK-205-02 bis P08. Jedes Playbook P01 bis P09 trägt am Ende sein Modul in die Liste ein; P10 löscht beide Listen und
   verlangt, dass kein Fall mehr offen ist. Prüfschritt: `npx vitest run --project unit tests/pruefung` zeigt alle Fälle als
   `todo`, keinen als rot; ein absichtlich eingetragenes Modul ohne Umsetzung macht dessen Fälle rot (Gegenprobe, danach
   zurücknehmen).
9. **Ablauf-Runner und Playwright-Konfiguration.** `playwright.config.ts` nach Profil, Abschnitt 2.2. Ablauf-Runner und
   `e2e/pruefung/testgrenzen.ts` (Testgrenzen, Q-R06, anfangs leer außer der Grenze für AK-408-03 in Firefox, die erst in P04
   greift). Prüfschritt: `E2E_LOGIN_MODE=test npx playwright test e2e/pruefung-ablauf.spec.ts --project=chromium` findet die
   Fälle und meldet sie als übersprungen („noch nicht gebaut“), nicht „keine Tests gefunden“.
10. **Testdaten.** `tests/pruefung/testdaten.test.ts` prüft `specs/pruefung/testdaten.json`: fünf Personen mit eindeutigem
    Schlüssel, Rolle, E-Mail und Konto, Anna, Bernd und Clara `angelegt`, Dora und Emil nicht; kein `id`-Feld. `prisma/seed.ts`
    liest die Datei (Gerüst); das Anlegen der Personen folgt in P02, wenn es `Person` gibt. Prüfschritt: der Testdaten-Test ist
    grün; `npm run db:seed` läuft ohne Fehler durch (legt noch nichts an).
11. **Profil bestätigen.** Zu jeder Zeile von Profil, Abschnitt 3, den Eintrag „Pfad vorhanden / folgt in Pn“ prüfen und
    Abweichungen in den PR unter „Bitte bestätigen“ schreiben. Prüfschritt: `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` meldet mit
    vorhandenem Quellcode keine Befunde. Im Blindtest-Branch meldet die Prüfung „fehlender-pfad“ für jeden Zielpfad unter `src/`,
    `prisma/`, `e2e/` und `tests/`, der noch nicht gebaut ist; das ist bis zum Bau erwartet und hängt von einer Werkzeuganpassung ab
    (Profil, Abschnitt 5, „Prüfung der Playbooks im Blindtest“).
12. **Compose und Container.** `docker-compose.yml`, `Dockerfile` und `docker/start-app.sh` sind vorhanden und werden nur gegen
    die Umgebungsvariablen aus `.env.example` abgeglichen. Container laufen in der Cloud-Sitzung nicht; der Stack wird in
    GitHub Actions geprüft. Prüfschritt: `docker compose config` ist nicht nötig; im PR steht, dass der Stack nur in CI läuft.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npm run lint` | keine Fehler |
| `npm run format:check` | „All matched files use Prettier code style!“ |
| `npm run typecheck` | keine Fehler |
| `npm run test:unit` | Gerüst-Tests grün (z. B. Testdaten), alle Prüffälle als `todo` (noch nicht gebaut) |
| `npm run test:db` | globales Setup migriert, Daten-Fälle als `todo` |
| `curl localhost:3000/api/health` (bei `npm run dev`) | HTTP 200 |
| `E2E_LOGIN_MODE=test npx playwright test --list --project=chromium` | Ablauf-Fälle werden gefunden |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

## 9. Abschluss

- Commit mit deutscher Beschreibung, z. B. „P00: Grundgerüst (Konfiguration, Prüf-Runner, Gesundheitsprüfung)“. Vor dem Push
  Lint, Format, Typecheck und Tests lokal grün (`CLAUDE.md`).
- Draft-PR mit: abgedeckte Teile (keine AK-IDs), Bestand des Wurzelordners (vorhanden/angelegt), Stand der Bau-Liste (leer), und
  „Bitte bestätigen“ für Abweichungen vom Profil. Hinweis, dass Firefox, Edge und der Compose-Stack nur in CI geprüft werden.
- Bericht an die Steuerung per `send_message`: Stand, Befehle und Ergebnisse, offene Punkte. Den Eintrag in `FORTSCHRITT.md`
  schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| `npm ci` scheitert bei `prisma generate` | Schema fehlt: zuerst `prisma/schema.prisma` anlegen (Schritt 3) oder `npm ci --ignore-scripts` |
| Das Startskript scheitert bei `db:migrate` | gleiche Ursache; Schema anlegen, `npm run db:migrate` erneut |
| Zeiten um eine oder zwei Stunden verschoben | Verbindung nicht über `createPrismaClient`; Sitzung muss in UTC laufen (Profil, Abschnitt 7) |
| `TEST_DATABASE_URL ist nicht gesetzt` | `.env` aus `.env.example` kopieren; Datenbank `berichtsheft_test` anlegen |
| Playwright findet keinen Browser | in der Cloud-Sitzung nicht installieren; `PLAYWRIGHT_BROWSERS_PATH` ist gesetzt, Chromium vorhanden |
| Frischer Worktree: Typecheck meldet fehlenden Client | `npx prisma generate` vor jedem Prüflauf |
| Ein Fall läuft nicht, obwohl sein Modul gebaut ist | Modul steht nicht in der Liste der gebauten Module, oder der Fall ist zurückgestellt (Schritt 8) |
| Prüf-Runner zeigt „0 Tests“ | `loadCases()` liest den falschen Ordner (relativ zur Datei, nicht zum Arbeitsverzeichnis) |
