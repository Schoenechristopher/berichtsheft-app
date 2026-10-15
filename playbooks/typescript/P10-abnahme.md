# P10 Abnahme (Q)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Umsetzung ist abgenommen: alle Prüffälle aller Module grün, die drei Beispielszenarien laufen, die Browser-Matrix (Chrome,
Firefox, Edge) und die Smartphone-Breite sind geprüft, die Bau-Stand-Listen der Runner sind entfernt und eine Demo-Anleitung für
diese Plattform liegt vor. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/*.json` (außer `testdaten.json`) grün sind, keiner als `todo` oder übersprungen außer den
   freigegebenen Testgrenzen (Q-R06),
2. die Prüffälle der Q-AK grün sind (2 AK-IDs; je ein Ablauf-Fall in `specs/pruefung/Q.json`),
3. die drei Szenario-Fälle in `specs/pruefung/szenarien.json` (AK-502-04, AK-703-06, AK-1022-07) in jedem Browser und bei 375 px
   grün sind,
4. CI (Lint, Format, Typecheck, Vitest, AK-Abdeckung, Landkarte, Compose mit Playwright in Chromium, Firefox, Edge und 375 px, axe,
   Screenshots) auf dem Branch grün ist.

## 2. Voraussetzungen

- P00 bis P09 abgenommen und gemergt; die letzte Prüfung auf dem Hauptzweig ist grün.
- Profil: Abschnitte 4, 5 und 7; Fach-Spec `specs/Q-plattform-und-qualitaet.md` (Regeln Q-R01 bis Q-R06, Abschnitt 8).
- Zugriff auf GitHub Actions (der Compose-Stack, Firefox und Edge laufen nur dort).

## 3. Eingaben

- Fach-Spec: `specs/Q-plattform-und-qualitaet.md` (AK-1101, AK-1102; Testgrenzen in Abschnitt 8; Beispielszenarien in Abschnitt 4).
- Prüffälle: `specs/pruefung/Q.json`, `specs/pruefung/szenarien.json`, alle Module `specs/pruefung/M01.json` bis `specs/pruefung/M09.json`.
- Vorgaben: `docs/ci-richtlinie.md`, `docs/01-spezifikation.md` (Beispielszenarien, Referenz), `README.md` für die Demo-Anleitung.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „Querschnitt“.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `playwright.config.ts`, `e2e/pruefung-ablauf.spec.ts`, `e2e/pruefung/testgrenzen.ts`,
`e2e/ak-1101-browser.spec.ts`, `e2e/ak-1102-smartphone.spec.ts`, `e2e/beispielszenarien.spec.ts`, `.github/workflows/ci.yml`. Die
Konfiguration ist 1:1 übertragbar.

## 5. Weg B: aus der Spec

Es gibt keinen neuen Fachcode. Bau-Reihenfolge der Abnahme: (1) Bau-Stand-Listen entfernen, (2) Q-Fälle und Szenarien, (3) Browser-Matrix
und Smartphone, (4) Testgrenzen prüfen, (5) CI, (6) Demo-Anleitung. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-1101 | Die Web-App funktioniert in Edge, Chrome und Firefox; nachgewiesen, indem alle Browser-Tests in allen drei Browsern laufen. | 1 (1 ablauf) | `specs/pruefung/Q.json` |
| AK-1102 | Bei 375 px sind alle Kernfunktionen und Seiten ohne waagerechtes Scrollen bedienbar. | 1 (1 ablauf) | `specs/pruefung/Q.json` |

AK-408 (Warnung beim Verlassen) trägt die einzige freigegebene Testgrenze: AK-408-03 läuft in Firefox nicht (Q-R06, Abschnitt 8 der
Spec); die Regel belegt dort AK-408-05. Die Szenarien liegen unter dem Modul der AK, die sie im Kern belegen (Q-R05).

## 6. Empfehlung

**Weg B.** Die Abnahme ist Prüfarbeit; Änderungen am Fachcode gehören in das Playbook des Moduls, nicht hierher. Findet die Abnahme einen
Fehler, meldet die Sitzung ihn der Steuerung, die das Modul-Playbook erneut vergibt.

## 7. Schritte

1. **Branch** `claude/p10-abnahme`; Hauptzweig aktuell. Prüfschritt: `git log` zeigt P00 bis P09.
2. **Bau-Stand-Listen entfernen.** In `tests/pruefung/cases.ts` die Listen der gebauten Module und der zurückgestellten Fälle löschen;
   ab jetzt läuft jeder Fall. Der Ablauf-Runner nutzt dieselben Listen nicht mehr. Prüfschritt: `npx vitest run --project unit
   tests/pruefung` meldet keinen `todo`-Fall.
3. **Alle Prüffälle lokal.** `npm test` (Projekte `unit` und `db`) und `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium
   --project=smartphone-375`. Prüfschritt: keine roten, keine übersprungenen Fälle außer den Testgrenzen.
4. **Q-Fälle (AK-1101, AK-1102).** `specs/pruefung/Q.json`: AK-1101-01 ist der Kernablauf (erfassen, speichern, einreichen, freigeben,
   Historie lesen) in jedem Browser; AK-1102-01 stellt das Gerät auf 375 px und liest auf jeder Seite aus Q-R03 mit `ansicht_lesen`,
   ob sie waagerecht scrollt (auch mit offener Rückfrage beim Einreichen und Ablehnen). „Kein Zugang“ kann der Ablauf nicht anmelden;
   die Seite prüft `e2e/ak-1102-smartphone.spec.ts`. Prüfschritt: beide Fälle grün in `chromium` und `smartphone-375`; Browser-Tests
   `e2e/ak-1101-browser.spec.ts` und `e2e/ak-1102-smartphone.spec.ts` grün.
5. **Beispielszenarien.** AK-502-04 (Einreichen scheitert an fehlendem Text), AK-703-06 (Vertretung nimmt Freigabe zurück) und
   AK-1022-07 (Erinnerung und Information an den Ausbilder) in `specs/pruefung/szenarien.json` sowie `e2e/beispielszenarien.spec.ts`.
   Prüfschritt: grün in Chromium und bei 375 px.
6. **Testgrenzen** (Q-R06): `e2e/pruefung/testgrenzen.ts` enthält genau die in Abschnitt 8 der Q-Spec freigegebene Grenze (AK-408-03 in
   Firefox) mit Grund, Freigabe und Ersatzbeleg; sie erscheint im Bericht als übersprungen mit Begründung. Prüfschritt: Der Ersatzfall
   AK-408-05 läuft in Firefox grün; keine weitere Grenze.
7. **Qualitätsprüfungen.** `npm run ak:abdeckung` erzeugt `docs/03-testabdeckung.md` neu (mitcommitten), danach `npm run ak:abdeckung -- --pruefen` (jede AK-ID hat einen Test oder Prüffall, die Datei `docs/03-testabdeckung.md`
   ist aktuell), `npm run landkarte -- --pruefen` (jede Datei unter `src/domain/`, `src/lib/`, `src/app/` und `src/components/` steht in
   `specs/code-landkarte.md`), `npm run pruefumfang -- --pruefen`. Weicht ein Dateiname der Umsetzung von der Landkarte ab, ist das ein
   Befund für die Steuerung („Bitte bestätigen“), kein Anlass, die Landkarte selbst zu ändern. Prüfschritt: alle drei Befehle ohne Befund.
8. **CI.** Erst lokal alles grün, dann gebündelt pushen, den Draft-PR erst auf „bereit“ setzen, wenn lokal alles grün ist
   (`docs/ci-richtlinie.md`). Beobachte die Jobs „Lint, Typecheck, Vitest“ und „Docker Compose + Playwright“ (Chromium, Firefox, Edge,
   375 px, axe, Screenshots); Logs nur gefiltert über die Werkzeuge der Plattform lesen. Ein Ausfall ohne Bezug zum Diff wird höchstens
   einmal neu gestartet. Prüfschritt: alle Jobs grün; Firefox- und Edge-Ergebnisse stehen im PR.
9. **Demo-Anleitung** für diese Plattform in `README.md` (Abschnitt „Demo“): Start mit `docker compose up` (App `http://localhost:3000`,
   Keycloak `http://localhost:8080`, Mailpit `http://localhost:8025`), `.env` aus `.env.example`, die Testpersonen Anna, Bernd und Clara
   (Dora ohne Zugang, Emil zum Anlegen) mit ihren Firmenkonten aus `keycloak/realm-berichtsheft.json`, die drei Beispielszenarien Schritt für
   Schritt (feste Uhr über `APP_FIXED_NOW`, Erinnerungslauf von Hand mit `npm run erinnerung`), Stand der Prüfläufe und Hinweis, dass Test-Login und
   Testschnittstelle im Produktionsmodus fehlen. Nur Testdaten, keine Geheimnisse. Prüfschritt: Ein frischer Klon folgt der Anleitung bis
   zum Szenario „Vertretung nimmt Freigabe zurück“ (in CI oder auf dem Rechner von Chris; in der Cloud-Sitzung laufen keine Container).
10. **Abnahmebericht.** Anzahl der Prüffälle je Modul und Ebene (grün/Testgrenze), Browser-Matrix, offene Punkte, Abweichungen von
    Landkarte und Profil. Prüfschritt: Zahlen stimmen mit `npm run ak:abdeckung` überein.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npm test` | alle Projekte grün, keine `todo`-Fälle |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375` | alle Tests und Ablauf-Fälle grün |
| `npm run test:e2e` (nur CI, Compose, `E2E_LOGIN_MODE=keycloak`) | grün in Chromium, Firefox, Edge und bei 375 px; AK-408-03 in Firefox als übersprungen mit Begründung |
| `E2E_LOGIN_MODE=test npx playwright test --project=a11y` | keine axe-Verstöße |
| `npm run ak:abdeckung -- --pruefen`, `npm run landkarte -- --pruefen`, `npm run pruefumfang -- --pruefen` | ohne Befund |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P10: Abnahme (Prüffälle, Browser-Matrix, Demo-Anleitung)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle der ganzen Umsetzung (Modul, AK-ID, Prüffälle, Test), Q-Nachweis (AK-1101, AK-1102), Testgrenze AK-408-03,
  dem Abnahmebericht und „Bitte bestätigen“.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Firefox oder Edge rot, lokal grün | nur in CI prüfbar: Diagnosemeldungen früh einbauen, ein Lauf kostet; kein Test pro Browser abschalten (Q-R01) |
| E2E-Job läuft sehr lange | Check-in nicht vor 60 Minuten; Ausfall ohne Bezug zum Diff höchstens einmal neu starten |
| Landkarte meldet unbekannte Dateien | Namen der Landkarte folgen oder den Befund der Steuerung melden; die Landkarte ändert ein Playbook nie |
| Abdeckung meldet eine AK-ID ohne Test | Test mit der AK-ID im Namen anlegen (`CLAUDE.md`), nicht den Namen eines Prüffalls umbenennen |
| Szenario scheitert nur im Compose-Stack | Uhr (`APP_FIXED_NOW`) und Seed prüfen; Test-Login ist im Container aus (Produktion) |
| Eine zweite Testgrenze scheint nötig | nie selbst eintragen; Q-R06 verlangt Freigabe von Chris |
