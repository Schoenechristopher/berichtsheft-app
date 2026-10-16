# P10 Abnahme (Q)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket G) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Umsetzung auf Liferay 6.2.5 ist abgenommen: alle Prüffälle aller Module grün oder freigegeben abweichend, die drei
Beispielszenarien laufen, Browser-Matrix (Chrome, Firefox, Edge) und Smartphone-Breite sind geprüft, die Bau-Stand-Listen
der Runner sind entfernt und eine Demo-Anleitung für 6.2.5 liegt vor. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/*.json` (außer `testdaten.json`) über die Runner von 6.2.5 grün sind; ausgenommen
   sind nur die Fälle mit `abweichend.liferay-625`, deren Abweichung Chris im Profil freigegeben hat (heute AK-101-01
   und AK-106-01, Profil 6.2.5, Abschnitt 6.1), und freigegebene Testgrenzen (Q-R06). Beide erscheinen im Bericht getrennt, nie als grün;
2. die Prüffälle der Q-AK grün sind (2 AK-IDs; je ein Ablauf-Fall in `specs/pruefung/Q.json`): AK-1101-01 in
   `chromium`, `firefox` und `msedge`, AK-1102-01 in `smartphone-375`;
3. die drei Szenario-Fälle in `specs/pruefung/szenarien.json` (AK-502-04, AK-703-06, AK-1022-07) in jedem Browser und bei
   375 px grün sind;
4. der Nachweis AK-505 und AK-508 vollständig ist: alle Zeilen der Tabellen im Profil („Nachweis AK-505 und AK-508“) mit
   grünem Prüffall oder eigenem Test, die Gegenproben aus P05 und P06 im Bericht;
5. der volle Liferay-6.2.5-Job der CI (Klasse L62, P00 Schritt 14) auf dem Branch grün ist.

Keine Schemaänderung; kein neuer Fachcode.

## 2. Voraussetzungen

- P00 bis P09 der Reihe abgenommen und gemergt; der letzte Lauf des Liferay-6.2.5-Jobs auf dem Hauptzweig ist grün.
- Profil 6.2.5, Abschnitte 4 (Prüf-Adapter, abweichende Fälle), 5 (Start, CI), 6 (Abweichungen), 7 und „Nachweis AK-505
  und AK-508“; Fach-Spec `specs/Q-plattform-und-qualitaet.md` (Regeln Q-R01 bis Q-R06, Abschnitt 8).
- Zugriff auf GitHub Actions: Portal mit Mailpit, Firefox und Edge laufen nur dort.

## 3. Eingaben

- Fach-Spec: `specs/Q-plattform-und-qualitaet.md` (AK-1101, AK-1102; Testgrenzen in Abschnitt 8; Beispielszenarien in
  Abschnitt 4).
- Prüffälle: `specs/pruefung/Q.json`, `specs/pruefung/szenarien.json`, alle Module `specs/pruefung/M01.json` bis
  `specs/pruefung/M09.json`; Format und Regel „Abweichend, begründet“ in `specs/pruefung/format.md`.
- Vorgaben: `docs/ci-richtlinie.md` (Klasse L62, „Prüfungen je Teil“), `docs/01-spezifikation.md` (Beispielszenarien,
  Referenz).
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „Querschnitt“.
- Testgrenzen der Referenz (lesen, nicht übernehmen ohne eigenen Befund): `e2e/pruefung/testgrenzen.ts`.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Vorbild für Konfiguration und Ablauf der Abnahme sind die Dateien der TypeScript-App
`e2e/pruefung-ablauf.spec.ts`, `e2e/pruefung/testgrenzen.ts`, `e2e/ak-1101-browser.spec.ts`,
`e2e/ak-1102-smartphone.spec.ts`, `e2e/beispielszenarien.spec.ts` und `.github/workflows/ci.yml`; übertragen wird nur
die Struktur, Adressen und Anmeldung kommen aus Profil 6.2.5, Abschnitt 4.3.

## 5. Weg B: aus der Spec

Es gibt keinen neuen Fachcode. Bau-Reihenfolge der Abnahme: (1) Bau-Stand-Listen entfernen, (2) alle Fälle lokal, (3)
Q-Fälle und Szenarien, (4) abweichende Fälle und Testgrenzen, (5) Nachweis AK-505 und AK-508, (6) Abdeckung, (7) CI mit
Browser-Matrix, (8) Demo-Anleitung, (9) Abnahmebericht. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-1101 | Die Web-App funktioniert in Edge, Chrome und Firefox; nachgewiesen, indem alle Browser-Tests in allen drei Browsern laufen. | 1 (1 ablauf): AK-1101-01 | `specs/pruefung/Q.json` |
| AK-1102 | Bei 375 px sind alle Kernfunktionen und Seiten ohne waagerechtes Scrollen bedienbar. | 1 (1 ablauf): AK-1102-01 | `specs/pruefung/Q.json` |

AK-1101 verlangt, dass **jeder** Ablauf-Fall in allen drei Browsern läuft (Q-R01), AK-1102 jeden auch bei 375 px (Q-R02).
Die Testgrenze der Referenz (AK-408-03 in Firefox, Q-Spec Abschnitt 8) übernimmt 6.2.5 nur, wenn ihr Prüfwerkzeug
dieselbe Grenze zeigt; sonst läuft der Fall auch in Firefox. Die Szenarien liegen unter dem Modul der AK, die sie im Kern
belegen (Q-R05).

## 6. Empfehlung

**Weg B.** Die Abnahme ist Prüfarbeit; Änderungen am Fachcode gehören in das Playbook des Moduls. Findet die Abnahme einen
Fehler, meldet die Sitzung ihn der Steuerung, die das Modul-Playbook erneut vergibt.

## 7. Schritte

1. **Branch** `claude/l62-p10-abnahme`; Hauptzweig aktuell. Prüfschritt: `git log` zeigt P00 bis P09 der Reihe.
2. **Bau-Stand-Listen entfernen.** In `BauStand.java` die Listen der gebauten Module und der zurückgestellten Fälle
   löschen; ab jetzt läuft jeder Fall, auch im Ablauf-Runner unter `liferay-625/e2e/`. Prüfschritt: Die Zusammenfassung
   von `ant pruefung-fachlogik` und `ant pruefung-daten` meldet 0 „noch nicht gebaut“.
3. **Alle Prüffälle lokal.** `ant test-unit pruefung-fachlogik test-db`, Portal starten, `ant pruefung-daten
   test-integration`, Playwright mit `--project=chromium --project=smartphone-375`. Prüfschritt: keine roten Fälle; als
   übersprungen nur die abweichenden Fälle (Schritt 6).
4. **Q-Fälle (AK-1101, AK-1102).** AK-1101-01 ist der Kernablauf (erfassen, speichern, einreichen, freigeben, Historie
   lesen) in jedem Browser; AK-1102-01 stellt das Gerät auf 375 px und liest auf jeder Seite aus Q-R03 mit `ansicht_lesen`,
   ob sie waagerecht scrollt, auch mit offener Rückfrage beim Einreichen und Ablehnen. „Kein Zugang“ kann der Ablauf
   nicht anmelden; die Seite prüft `liferay-625/e2e/ak-1102-smartphone.spec.ts` mit Dora (Liferay-Konto ohne
   `BH_Person`). Eigene Browser-Tests `liferay-625/e2e/ak-1101-browser.spec.ts` und `ak-1102-smartphone.spec.ts`
   (Namen ab der AK-ID). Prüfschritt: beide Fälle grün in `chromium` und `smartphone-375`; Firefox und Edge in Schritt 9.
5. **Beispielszenarien.** AK-502-04 (Einreichen scheitert an fehlendem Text), AK-703-06 (Vertretung nimmt Freigabe zurück)
   und AK-1022-07 (Erinnerung und Information an den Ausbilder; Erinnerungslauf über die Testschnittstelle, Takt und
   Fälligkeit nach Profil 6.2.5, Abschnitt 3 „Hintergrundjobs“). Prüfschritt: grün in Chromium und bei 375 px.
6. **Abweichende Fälle.** Der Runner weist jeden Fall mit `abweichend.liferay-625` als „abweichend, begründet“ mit Verweis
   aus (heute AK-101-01 und AK-106-01, Profil 6.2.5, Abschnitt 6.1); er zählt nie als grün. Prüfschritt: Liste im Bericht stimmt mit
   `grep -l '"liferay-625"' specs/pruefung/*.json` und den Fällen darin überein; ein Fall mit Markierung, dessen Verweis
   nicht auf einen freigegebenen Abschnitt des Profils zeigt, ist ein Befund für die Steuerung.
7. **Testgrenzen** (Q-R06). Läuft AK-408-03 in Firefox (Schritt 9) grün, gibt es auf 6.2.5 keine Testgrenze. Zeigt der
   Lauf dieselbe Grenze des Werkzeugs wie in der Referenz, trägt die Sitzung sie **nicht** selbst ein, sondern meldet sie
   der Steuerung mit Grund und Ersatzbeleg (AK-408-05); Q-R06 verlangt die Freigabe durch Chris. Prüfschritt: Bericht
   nennt das Ergebnis für AK-408-03 in Firefox.
8. **Nachweis AK-505 und AK-508.** Jede Zeile der beiden Tabellen im Profil mit Beleg: Prüffälle AK-505-01, AK-505-02,
   AK-505-03, AK-505-04 (Daten), AK-505-05, AK-505-06, AK-505-07 (Fachlogik), AK-803-01, AK-803-02, AK-803-03,
   AK-803-04, AK-803-05 (Daten), AK-508-01, AK-508-02, AK-508-03, AK-508-04, AK-508-05 (Daten), AK-508-06, AK-508-07,
   AK-508-08, AK-508-09, AK-508-10, AK-508-11 (Fachlogik), dazu die eigenen Tests
   `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest`, `AK803_TriggerDerHistorieTest`,
   `AK803_ModelListenerTest`, `AK803_ModelListenerAngemeldetTest`, `AK508_SperreUndBedingtesUpdateTest`,
   `AK508_ZweiGleichzeitigeAktionenTest`. Die Gegenproben aus P05 (Schritt 13) und P06 (Schritt 10) werden einmal auf dem
   abgenommenen Stand wiederholt. Prüfschritt: Nachweistabelle im Bericht ohne Lücke; jede Gegenprobe macht ihre Fälle
   rot und ist zurückgenommen.
9. **CI mit Browser-Matrix.** Erst lokal alles grün, dann gebündelt pushen, den Draft-PR erst auf „bereit“ setzen, wenn
   lokal alles grün ist (`docs/ci-richtlinie.md`). Der volle Liferay-6.2.5-Job läuft mit `chromium`, `firefox`, `msedge`,
   `smartphone-375` und `a11y` (Label `volle-pruefung`, falls der Job sonst nur Chromium fährt, siehe „Bitte
   bestätigen“). Logs nur gefiltert über die Werkzeuge der Plattform lesen; ein Ausfall ohne Bezug zum Diff wird
   höchstens einmal neu gestartet. Prüfschritt: alle Jobs grün; Ergebnisse für Firefox und Edge stehen im PR.
10. **Abdeckung.** `npm run ak:abdeckung` zählt nur Tests der TypeScript-App. Für 6.2.5 erzeugt das Ant-Ziel
    `pruefbericht` aus den JUnit-Berichten (`test-results/`) und dem Playwright-Bericht eine Tabelle je AK-ID: Prüffälle
    (grün, abweichend, Testgrenze) und eigene Tests (Namen ab der AK-ID, Profil 6.2.5, Abschnitt 4.1). Ob `npm run ak:abdeckung` die
    Java-Tests mitzählen soll, ist eine Werkzeugänderung mit eigenem Auftrag (Profil 6.2.5, Abschnitt 4.1, „Bitte bestätigen“).
    Prüfschritt: jede AK-ID aller Fach-Specs hat mindestens einen grünen Prüffall oder eigenen Test, oder sie ist
    freigegeben abweichend.
11. **Demo-Anleitung** in `liferay-625/README.md` (Abschnitt „Demo“): Einrichten nach P00 (JDK 8, Bundle, SDK,
    `portal-ext.properties` aus der Vorlage), Start, Adressen (`http://localhost:8080/web/berichtsheft/anmelden`, Mailpit
    `http://localhost:8025`), Testdaten Anna, Bernd und Clara mit Liferay-Konto und Demo-Passwort aus der Konfiguration
    (Dora ohne Zugang, Emil zum Anlegen), die drei Beispielszenarien Schritt für Schritt (Uhr und Erinnerungslauf über die
    Testschnittstelle, nur bei `bh.betrieb=test`), Messwerte aus P00, Stand der Prüfläufe, die abweichenden Fälle mit
    Begründung und der Hinweis, dass Testschnittstelle und stellbare Uhr bei `bh.betrieb=produktion` fehlen. Nur
    Testdaten, Passwörter nur als Platzhalter. Prüfschritt: Ein frischer Klon folgt der Anleitung bis zum Szenario
    „Vertretung nimmt Freigabe zurück“ (in der Sitzung nativ oder in CI).
12. **Abnahmebericht.** Anzahl der Prüffälle je Modul und Ebene (grün, abweichend, Testgrenze), Browser-Matrix, Messwerte
    (Laufzeit des vollen Jobs, Speicher), Nachweistabelle AK-505 und AK-508, offene Punkte, Abweichungen von Landkarte
    und Profil. Prüfschritt: Zahlen stimmen mit dem Ant-Ziel `pruefbericht` überein.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant test-unit pruefung-fachlogik test-db` | grün, 0 „noch nicht gebaut“ |
| `ant pruefung-daten test-integration` (Portal mit `bh.betrieb=test`) | grün, 0 „noch nicht gebaut“ |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375` | alle Ablauf-Fälle grün außer AK-101-01 und AK-106-01 („abweichend, begründet“) |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=a11y` | keine axe-Verstöße |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=firefox --project=msedge` (nur CI) | wie Chromium; AK-408-03 in Firefox nur mit freigegebener Testgrenze übersprungen |
| `ant pruefbericht` | Tabelle je AK-ID ohne Lücke |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „L62 P10: Abnahme (Prüffälle, Browser-Matrix, Demo-Anleitung)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle der ganzen Umsetzung (Modul, AK-ID, Prüffälle, Test), Q-Nachweis (AK-1101, AK-1102), den
  abweichenden Fällen (AK-101-01, AK-106-01) mit Verweis, dem Ergebnis zu AK-408-03 in Firefox, der Nachweistabelle
  AK-505 und AK-508, dem Abnahmebericht und „Bitte bestätigen“. Änderungsklasse L62 (und D für die Anleitung); Chris
  mergt.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Firefox oder Edge rot, lokal grün | nur in CI prüfbar: Diagnosemeldungen früh einbauen, ein Lauf kostet; kein Test pro Browser abschalten (Q-R01) |
| Voller Job läuft sehr lange oder bricht aus Speichermangel ab | Messwerte aus P00 vergleichen; Browser nacheinander statt parallel, Heap nach P00 |
| Abweichender Fall erscheint als grün | Runner liest `abweichend.liferay-625` nicht; „abweichend, begründet“ ausweisen (P00, Schritt 11) |
| Eine Testgrenze scheint nötig | nie selbst eintragen; Q-R06 verlangt Freigabe von Chris |
| Szenario AK-1022-07 scheitert an der Uhrzeit | Fälligkeit entscheidet die Fachlogik in Europe/Berlin, nicht der Cron-Ausdruck in GMT (Profil 6.2.5, Abschnitte 3, 7) |
| Ablauf scheitert nur in CI beim `anmelden` | Folgeseiten der Anmeldung oder Sitzungswarnung im CI-Portal an; `portal-ext.properties` der CI mit der Vorlage vergleichen |
| AK-ID ohne Beleg im `pruefbericht` | Test mit der AK-ID im Namen anlegen (`CLAUDE.md`, Profil 6.2.5, Abschnitt 4.1), nicht den Namen eines Prüffalls umbenennen |
| Landkarte und Umsetzung weichen ab | Befund für die Steuerung; ein Playbook ändert die Landkarte nie |

## Bitte bestätigen

- [ ] Firefox, Edge und `a11y` im vollen Liferay-6.2.5-Job: `docs/ci-richtlinie.md` („Prüfungen je Teil“) nennt für
      Liferay nur Playwright mit Chromium, AK-1101 und Q-R01 verlangen jeden Ablauf-Fall in allen drei Browsern
      (abweichend, begründet; Vorschlag: alle Browser beim bereiten PR der Klasse L62 bzw. mit `volle-pruefung`).
- [ ] Ant-Ziel `pruefbericht` als Abdeckungsnachweis für 6.2.5, solange `npm run ak:abdeckung` keine Java-Tests zählt.
- [ ] Demo mit `bh.betrieb=test` (Testdaten und Uhr über die Testschnittstelle); eine Demo im Produktivbetrieb bräuchte
      einen eigenen Weg zum Laden der Testdaten.
