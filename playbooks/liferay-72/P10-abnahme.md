# P10 Abnahme (Q)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket H) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Umsetzung auf Liferay 7.2 ist abgenommen: alle Prüffälle aller Module grün oder freigegeben „abweichend, begründet“, die
drei Beispielszenarien laufen, die Browser-Matrix (Chrome, Firefox, Edge) und die Smartphone-Breite sind geprüft, die
Bau-Stand-Listen der Prüf-Adapter sind entfernt, der CI-Job der Klasse L72 ist grün und eine Demo-Anleitung für 7.2 liegt vor.
Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/*.json` (außer `testdaten.json`) über die Prüf-Adapter grün sind; keiner „noch nicht
   gebaut“; als „abweichend, begründet“ nur die im Profil freigegebenen Fälle (darunter AK-101-01 und AK-106-01, Profil 6.1),
   getrennt gezählt und nie grün; übersprungen nur freigegebene Testgrenzen (Q-R06);
2. die Prüffälle der Q-AK grün sind (2 AK-IDs; AK-1101-01 und AK-1102-01 in `specs/pruefung/Q.json`);
3. die drei Szenario-Fälle in `specs/pruefung/szenarien.json` (AK-502-04, AK-703-06, AK-1022-07) in jedem Browser und bei 375 px
   grün sind;
4. die plattformeigenen Tests (Nachweis AK-505 und AK-508, Historie, Zeitzone, Zugang) grün sind und ihre Gegenproben aus P05
   und P06 einmal auf dem abgenommenen Stand wiederholt sind (Schritt 7);
5. der Job „Liferay 7.2“ (Klasse L72, `docs/ci-richtlinie.md`) auf dem Branch grün ist: Gradle-Build, alle Prüf-Adapter,
   Playwright in Chromium, Firefox, Edge und 375 px, axe.

## 2. Voraussetzungen

- L72-P00 bis L72-P09 abgenommen und gemergt; der letzte Lauf des Jobs „Liferay 7.2“ auf dem Hauptzweig ist grün.
- Der CI-Job der Klasse L72 nach dem Vorschlag aus P00 (Schritt 16) ist freigegeben und gemergt.
- Profil: Abschnitte 4, 5, 6 und 7 und „Nachweis AK-505 und AK-508“; Fach-Spec `specs/Q-plattform-und-qualitaet.md` (Regeln Q-R01
  bis Q-R06, Abschnitt 8).
- Zugriff auf GitHub Actions: Firefox, Edge und der vollständige Lauf mit Bundle aus dem Cache laufen nur dort.

## 3. Eingaben

- Fach-Spec: `specs/Q-plattform-und-qualitaet.md` (AK-1101, AK-1102; Testgrenzen in Abschnitt 8; Beispielszenarien in
  Abschnitt 4).
- Prüffälle: `specs/pruefung/Q.json`, `specs/pruefung/szenarien.json`, alle Module `specs/pruefung/M01.json` bis
  `specs/pruefung/M09.json`; „Abweichend, begründet“ in `specs/pruefung/format.md`.
- Vorgaben: `docs/ci-richtlinie.md` (Abschnitt 7, Klasse L72), `docs/01-spezifikation.md` (Beispielszenarien, Referenz).
- Profil: Abschnitt 6 (alle Abweichungen mit Prüffall-ID) und die Freigaben von Chris dazu.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „Querschnitt“.

## 4. Weg A: aus dem Quellcode

Nicht anwendbar für die Liferay-Teile. Aus der TypeScript-App übernimmt die Abnahme nur Aufbau und Inhalt der Browser-Tests als
Vorbild (`e2e/ak-1101-browser.spec.ts`, `e2e/ak-1102-smartphone.spec.ts`, `e2e/beispielszenarien.spec.ts`); die Ablauf-Fälle
selbst laufen über den Ablauf-Adapter `liferay-72/pruefung/` unverändert.

## 5. Weg B: aus der Spec

Es gibt keinen neuen Fachcode. Bau-Reihenfolge der Abnahme: (1) Bau-Stand-Listen entfernen, (2) alle Prüffälle und Abweichungen
zählen, (3) Q-Fälle und Szenarien, (4) Browser-Matrix und Smartphone, (5) Testgrenzen prüfen, (6) Nachweis AK-505 und AK-508
wiederholen, (7) CI, (8) Demo-Anleitung, (9) Abnahmebericht. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-1101 | Die Web-App funktioniert in Edge, Chrome und Firefox; nachgewiesen, indem alle Browser-Tests in allen drei Browsern laufen. | 1 (1 ablauf) | gleichwertig; Firefox und Edge nur im CI-Job |
| AK-1102 | Bei 375 px sind alle Kernfunktionen und Seiten ohne waagerechtes Scrollen bedienbar. | 1 (1 ablauf) | gleichwertig für alle Seiten der Site „Berichtsheft“; die Verwaltung von Liferay ist kein Teil der App (Profil 6.3) |

Testgrenzen: Die Grenze AK-408-03 in Firefox (Q, Abschnitt 8) übernimmt 7.2 **nur**, wenn der Ablauf-Adapter dort dieselbe Grenze
des Werkzeugs zeigt; sonst läuft der Fall auch in Firefox. Die Szenarien liegen unter dem Modul der AK, die sie im Kern belegen
(Q-R05).

## 6. Empfehlung

**Weg B.** Die Abnahme ist Prüfarbeit; Änderungen an Fachcode, Service oder Theme gehören in das Playbook des Moduls, nicht
hierher. Findet die Abnahme einen Fehler, meldet die Sitzung ihn der Steuerung, die das Modul-Playbook erneut vergibt.

## 7. Schritte

1. **Branch** `claude/l72-p10-abnahme`; Hauptzweig aktuell. Prüfschritt: `git log` zeigt L72-P00 bis L72-P09.
2. **Bau-Stand-Listen entfernen.** Die Listen der gebauten Module und der zurückgestellten Fälle im Fachlogik- und im
   Daten-Adapter löschen; ab jetzt läuft jeder Fall. Der Ablauf-Adapter nutzt dieselben Listen nicht mehr. Prüfschritt:
   `./gradlew :modules:bh-domain:test` meldet keinen Fall „noch nicht gebaut“.
3. **Alle Prüffälle lokal.** Bundle starten, `./gradlew build deploy`, dann `./gradlew :modules:bh-domain:test`,
   `./gradlew :modules:bh-test-integration:testIntegration` und der Ablauf-Adapter in Chromium und 375 px. Prüfschritt: keine
   roten, keine „noch nicht gebaut“; „abweichend, begründet“ genau die Fälle, die das Profil nennt und Chris freigegeben hat.
4. **Abweichungen zählen.** Jeder Fall mit `"abweichend": { "liferay-72": … }` erscheint mit Verweis getrennt im Bericht.
   Prüfschritt: Die Liste stimmt mit Profil, Abschnitt 6 überein; ein Fall mit `abweichend`, dessen Abweichung nicht freigegeben
   ist, ist ein Befund für die Steuerung, kein grüner Fall.
5. **Q-Fälle (AK-1101, AK-1102).** AK-1101-01 ist der Kernablauf (erfassen, speichern, einreichen, freigeben, Historie lesen) in
   jedem Browser; AK-1102-01 stellt das Gerät auf 375 px und liest auf jeder Seite aus Q-R03 mit `ansicht_lesen`, ob sie
   waagerecht scrollt (auch mit offener Rückfrage beim Einreichen und Ablehnen). Die Anmeldung läuft über das Login-Portlet
   (Profil, Abschnitt 4). „Kein Zugang“ kann der Ablauf nicht anmelden; dafür ein eigener Playwright-Test in `liferay-72/pruefung/`
   wie `e2e/ak-1102-smartphone.spec.ts`. Prüfschritt: beide Fälle grün in `chromium` und `smartphone-375`.
6. **Beispielszenarien.** AK-502-04 (Einreichen scheitert an fehlendem Text), AK-703-06 (Vertretung nimmt Freigabe zurück) und
   AK-1022-07 (Erinnerung und Information an den Ausbilder) in `specs/pruefung/szenarien.json`. Prüfschritt: grün in Chromium und
   bei 375 px; bei AK-502-04 bleiben die mitgeschickten Tage als Entwurf (Ergebnis statt Ausnahme, P05).
7. **Nachweis AK-505 und AK-508 wiederholen.** Die plattformeigenen Tests `ReportDayProtectionTest`, `HistoryProtectionTest`,
   `ConcurrentTransitionTest` und der Zeitzonen-Test laufen grün. Auf dem abgenommenen Stand je eine Gegenprobe wiederholen und
   zurücknehmen: F-P05-2 „Pflichtangaben als Ausnahme“ macht AK-505-03 rot; F-P05-7 „Ohne Sperre und Bedingung“ macht
   `ConcurrentTransitionTest.AK508_vonZweiGleichzeitigenAktionenGelingtGenauEine` rot; F-P06-1 „Änderungsschutz der Historie fehlt“
   macht AK-803-01 rot. Prüfschritt: drei rote Läufe im Abnahmebericht, danach grün.
8. **Testgrenzen** (Q-R06): Für 7.2 ist keine eigene Testgrenze freigegeben. AK-408-03 läuft in Firefox im CI-Job; zeigt der
   Ablauf-Adapter dort dieselbe Grenze des Werkzeugs wie die TypeScript-App, wird sie mit Grund, Freigabe und Ersatzbeleg (AK-408-05)
   übernommen und erscheint als übersprungen mit Begründung. Prüfschritt: keine weitere Grenze; nie selbst eintragen.
9. **CI.** Erst lokal alles grün, dann gebündelt pushen, den Draft-PR erst auf „bereit“ setzen, wenn lokal alles grün ist
   (`docs/ci-richtlinie.md`); erst dann läuft der Job „Liferay 7.2“ (Klasse L72). Er läuft mit den Messwerten aus P00 (Zeitlimit,
   Heap, ggf. Firefox und Edge getrennt). Logs nur gefiltert über die Werkzeuge der Plattform lesen; ein Ausfall ohne Bezug zum
   Diff wird höchstens einmal neu gestartet. Prüfschritt: alle Jobs grün; Firefox- und Edge-Ergebnisse und die gemessene Laufzeit
   stehen im PR.
10. **Demo-Anleitung** in `liferay-72/README.md`: Bezug des Bundles von SourceForge (gemeinsam 4.1), JDK 11, PostgreSQL,
    `./gradlew initBundle build deploy`, Start mit `catalina.sh`, eingebetteter Suchdienst; oder `docker compose` mit
    `liferay/portal:7.2.1-ga2` aus `liferay-72/` (Profil, Abschnitt 5). Die Testpersonen Anna, Bernd und Clara (Dora ohne Zugang,
    Emil zum Anlegen) mit ihren Liferay-Konten und Platzhalter-Passwörtern nur bei `bh.betrieb=test`; die drei Szenarien Schritt für
    Schritt mit gestellter Uhr über die Testschnittstelle; Mailpit für die E-Mails (synchroner Versand, gemeinsam 3.2); Hinweis, dass
    Testschnittstelle und stellbare Uhr bei `bh.betrieb=produktion` fehlen und 7.2 CE keine Sicherheitsupdates bekommt (nur Demo).
    Nur Testdaten, keine Geheimnisse. Prüfschritt: Ein frischer Klon folgt der Anleitung bis zum Szenario „Vertretung nimmt Freigabe
    zurück“ (im CI-Job oder auf dem Rechner von Chris).
11. **Abnahmebericht.** Anzahl der Prüffälle je Modul und Ebene (grün, abweichend begründet, Testgrenze), Browser-Matrix,
    plattformeigene Tests mit AK-ID, Gegenproben aus Schritt 7, Laufzeit und Speicher des CI-Jobs gegen die Messung aus P00, offene
    Punkte, Abweichungen von Landkarte und Profil. Prüfschritt: Zahlen stimmen mit den JUnit-Berichten (`build/test-results/`) und
    dem Bericht des Ablauf-Adapters überein.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew build` | grün |
| `./gradlew :modules:bh-domain:test` | alle Fachlogik-Fälle grün, keiner „noch nicht gebaut“; „abweichend, begründet“ getrennt gezählt |
| `./gradlew :modules:bh-test-integration:testIntegration` | alle Daten-Fälle und plattformeigenen Tests grün |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | alle Ablauf-Fälle grün; AK-101-01 und AK-106-01 „abweichend, begründet“ |
| Job „Liferay 7.2“ in GitHub Actions | grün in Chromium, Firefox, Edge und bei 375 px, axe ohne Verstöße auf den Seiten der App |
| `./gradlew formatSource` | keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „L72-P10: Abnahme (Prüffälle, Browser-Matrix, Demo-Anleitung)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle der ganzen Umsetzung (Modul, AK-ID, Prüffälle, Test, Bewertung auf 7.2), Q-Nachweis (AK-1101,
  AK-1102), den abweichenden Fällen mit Verweis, den Testgrenzen, dem Abnahmebericht und „Bitte bestätigen“. Änderungsklasse L72;
  Chris mergt.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Firefox oder Edge rot, lokal grün | nur im CI-Job prüfbar: Diagnosemeldungen früh einbauen, ein Lauf kostet; kein Test pro Browser abschalten (Q-R01) |
| Job „Liferay 7.2“ überschreitet das Zeitlimit | Messung aus P00 heranziehen; Firefox und Edge in getrennte Jobs, Bundle aus dem Cache; nicht einfach das Limit erhöhen |
| Speicher reicht im CI-Job nicht | Heap nach P00 senken, Browser trennen, sonst entfernter Suchdienst-Knoten (Profil, Abschnitt 7) |
| Ein abweichender Fall wird grün gezählt | Fälle mit `abweichend.liferay-72` sind nie grün; getrennt melden (`specs/pruefung/format.md`) |
| Szenario AK-502-04 verliert die Tage | `submit` wirft bei fehlenden Pflichtangaben; zurück an P05 (Ergebnis statt Ausnahme) |
| Eine zweite Testgrenze scheint nötig | nie selbst eintragen; Q-R06 verlangt Freigabe von Chris |
| Landkarte nennt TypeScript-Dateien | die Landkarte beschreibt die Referenz; Abweichungen der Java-Namen sind ein Befund für die Steuerung, die Landkarte ändert ein Playbook nie |
