# U06 Abnahme

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-625.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4,
Paket I) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Das Upgrade 6.2.5 → 7.2 ist abgenommen: Berichte, Statuswechsel und Kommentare kommen unverändert an, und die
aktualisierte Instanz besteht dieselbe Prüfung wie eine frisch gebaute 7.2-Umsetzung. Fertig, wenn:

1. **Alle Upgrade-Prüffälle grün:** der Upgrade-Runner aus U03 führt jede Datei unter `specs/pruefung/upgrade/` aus
   (`berichte.json`, `historie.json`, `version.json`, `personen.json`, `benachrichtigungen.json`), kein Fall ist rot,
   fehlerhaft oder ausgelassen. Darunter Schreibschutz der Tage (AK-505), Versionsstand (AK-508), Historie und
   Kommentare unveränderlich (AK-801, AK-802, AK-803), Personen und Rollen (AK-104, AK-201, AK-203, AK-204) und
   Benachrichtigungen (AK-1004, AK-1011, AK-1015, AK-1021). Ein Fall mit `abweichend` zählt nur mit Freigabe und wird
   getrennt ausgewiesen.
2. **Alle Prüffälle auf 7.2 grün:** auf einer aktualisierten Instanz (nicht auf einer frischen) laufen alle Prüffälle
   aus `specs/pruefung/` der Ebenen `fachlogik`, `daten` und `ablauf` wie in P10 der Reihe 7.2, darunter AK-505-01 bis
   AK-505-07, AK-508-01 bis AK-508-11 und AK-803-01 bis AK-803-05. Abweichende Fälle nur mit freigegebener Abweichung im
   Profil.
3. Die Kennzahlen aus U01 und U03 (Zeilenzahlen und Hashes der App-Tabellen) sind vor und nach dem gesamten Upgrade
   gleich, außer `BH_Notification.userNotificationEventId`.
4. Der Rücksprung aus U01 ist nach einem absichtlich abgebrochenen Upgrade einmal erprobt: 6.2.5 läuft auf der
   Originaldatenbank mit unveränderten Kennzahlen.
5. Laufzeit und Speicherbedarf des Upgrade-Runners sind gemessen; eine Anleitung
   `liferay-72/upgrade-625/anleitung.md` beschreibt das Upgrade einer Demo-Instanz Schritt für Schritt (U01 bis U05).

Keine Schemaänderung.

## 2. Voraussetzungen

- U00 bis U05 abgenommen; P10 der Reihen 6.2.5 und 7.2 grün.
- Ein Workflow der Prüfklasse U (`workflow_dispatch`, `docs/ci-richtlinie.md`, Tabelle der Prüfklassen) führt den
  Upgrade-Runner aus. Fehlt er, legt ihn ein eigener Auftrag an (`.github/**` ist ohne Auftrag tabu).
- Profile: `profile/liferay-72.md`, 4 (Prüf-Adapter) und 5 (CI).

## 3. Eingaben

- Prüffälle: alle Dateien unter `specs/pruefung/upgrade/` und unter `specs/pruefung/`; Format in
  `specs/pruefung/format.md` („Aufbau eines Upgrade-Falls“, „Abweichend, begründet“).
- Ergebnisse und Kennzahlen aus U01 bis U05; Upgrade-Runner unter `liferay-72/upgrade-625/pruefung/`.
- `docs/06-spec-architektur.md`, Tabelle U00–U06 (U06: „Upgrade-Prüffälle … und alle Prüffälle auf 7.2 grün“).

## 4. Weg A: aus dem Quellcode

Nicht anwendbar; U06 baut nichts Neues. Gelesen werden nur Runner und Skripte aus U01 bis U05.

## 5. Weg B: aus der Spec

Aus `docs/06-spec-architektur.md` und dem Format die beiden Abnahmen: Upgrade-Fälle (Vergleich vorher/nachher) und
alle Prüffälle auf 7.2. Reihenfolge: Upgrade-Fälle → Prüffälle auf der aktualisierten Instanz → Kennzahlen →
Rücksprung → Messung → Anleitung.

## 6. Empfehlung

**Weg B.** Abnahme heißt Prüfen, nicht Bauen.

## 7. Schritte

1. **Upgrade-Fälle ausführen.** Workflow der Klasse U mit allen Dateien unter `specs/pruefung/upgrade/`. Prüfschritt:
   jede ID erscheint als eigener Testfall; alle grün; keiner als „fehlerhaft“ (abweichendes `vorher`) oder ausgelassen.
2. **Gegenprobe.** Einen Upgrade-Schritt absichtlich verfälschen (z. B. setzt `bh-upgrade-625` `readAt` aller
   App-Nachrichten): der Fall zu AK-1015 in `benachrichtigungen.json` wird rot. Danach zurücknehmen und Schritt 1
   wiederholen.
3. **Alle Prüffälle auf der aktualisierten Instanz.** Nach einem Upgrade-Lauf die Prüfung aus P10 der Reihe 7.2
   (Fachlogik, Daten über die Testschnittstelle, Ablauf mit Playwright) gegen diese Instanz ausführen; die
   Testschnittstelle stellt vor jedem Fall ihren eigenen Bestand her. Prüfschritt: Ergebnis gleich dem von P10 der
   Reihe 7.2; Firefox und Edge nur in CI.
4. **Kennzahlen.** Vergleich `kennzahlen-625.txt` gegen die Kennzahlen nach U05. Prüfschritt: gleich bis auf
   `userNotificationEventId`.
5. **Rücksprung erproben.** Upgrade nach Phase 1 (U03, Schritt 3) absichtlich abbrechen, Kopie verwerfen, 6.2.5 auf der
   Originaldatenbank starten (U01). Prüfschritt: Kennzahlen gleich `kennzahlen-625.txt`; Anmeldung von Anna gelingt.
6. **Messen.** Laufzeit je Upgrade-Fall und gesamt, Speicherspitze, Plattenbedarf auf dem Standard-Runner. Prüfschritt:
   Werte im PR; bei mehr als 60 Minuten gesamt ein Vorschlag zur Parallelität (getrennte Datenbanken je Fall, nie ein
   gemeinsamer Bestand).
7. **Anleitung schreiben.** `liferay-72/upgrade-625/anleitung.md`: Sicherung, Upgrade, Konfiguration, Index,
   Kontrolle, Rücksprung, mit den Befehlen aus U01 bis U05; nur Testdaten. Prüfschritt: Eine zweite Person (oder
   Sitzung) kann ihr folgen, ohne die Playbooks zu lesen.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| Workflow der Klasse U, alle Upgrade-Fälle (in CI) | 17 Fälle grün (Stand der Fälle bei Abschluss dieser Reihe), keiner fehlerhaft |
| Prüfung aus P10 der Reihe 7.2 auf der aktualisierten Instanz (in CI) | alle Prüffälle grün, abweichende nur mit Freigabe |
| Kennzahlen-Vergleich (Schritt 4) | gleich bis auf `userNotificationEventId` |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „U06: Abnahme des Upgrades 6.2.5 → 7.2“.
- Draft-PR mit Tabelle der Upgrade-Fälle (ID, Gegenstand, Ergebnis), Ergebnis der Prüffälle auf 7.2, Kennzahlen,
  Rücksprung, Messwerte und Anleitung; abweichende Fälle getrennt ausgewiesen. „Bitte bestätigen“: offene Punkte aus
  U00 bis U05, die erst im laufenden System entschieden wurden. Hinweis: Prüfklasse U läuft nur von Hand.
- Bericht an die Steuerung per `send_message`; den Eintrag in `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Ein Upgrade-Fall ist „fehlerhaft“ (nicht rot) | `vorher` stimmt auf 6.2.5 nicht; zuerst die Reihe 6.2.5 prüfen, nicht das Upgrade |
| Prüffälle auf der aktualisierten Instanz rot, auf frischer 7.2 grün | Rest aus 6.2.5 (Konfiguration U04, Portlet-IDs U03, Theme); Unterschied der Instanzen vergleichen |
| Workflow läuft in die Zeitgrenze | Fälle parallel in getrennten Datenbanken (Schritt 6); kein gemeinsamer Bestand |
| Fall nur in Firefox rot | Testgrenze nach Profil prüfen; Firefox gibt es nur in CI |
| Rücksprung zeigt andere Kennzahlen | 6.2.5 lief auf der Kopie statt auf dem Original oder lief während der Sicherung weiter (U01) |
