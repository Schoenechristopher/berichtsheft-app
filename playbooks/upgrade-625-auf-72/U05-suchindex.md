# U05 Suchindex

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4, Paket I) · Status:
**Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Der Suchindex von 7.2 ist aus dem aktualisierten Bestand neu aufgebaut. Der Lucene-Index von 6.2.5 wird nicht
übernommen; die App liest nie aus dem Index (`profile/liferay-72.md`, 1, „Suchdienst“). Fertig, wenn:

1. Der eingebettete Elasticsearch-Knoten von 7.2 läuft, und ein einmaliger Neuaufbau aller Indizes ist ohne Fehler
   durchgelaufen.
2. Die Verwaltung von Liferay zeigt die Konten der Testpersonen (Benutzerliste im Control Panel liest aus dem Index).
3. `index.on.startup` steht danach wieder auf `false`.
4. Der Neuaufbau ändert keine Daten der App: Die Kennzahlen aus U03 (Schritt 10) sind gleich, und alle Upgrade-Fälle
   unter `specs/pruefung/upgrade/` bleiben grün, darunter die Fälle zu AK-505, AK-508 und AK-803.

Keine Schemaänderung.

## 2. Voraussetzungen

- U03 und U04 abgenommen.
- Profile: `profile/liferay-72.md`, 1 (Suchdienst, Speicher) und 7 (Elasticsearch und Speicher);
  `profile/liferay-gemeinsam.md`, 4.4.
- Sandbox: nur in CI (Klasse U).

## 3. Eingaben

- `liferay-72/configs/common/` (Konfiguration des Konnektors, `index.on.startup=false`).
- Kennzahlen aus U03, Schritt 10.
- Prüffälle: alle Dateien unter `specs/pruefung/upgrade/`.
- Liferay-Doku: Neuaufbau der Suchindizes nach einem Upgrade.

## 4. Weg A: aus dem Quellcode

Kein eigener Code; die App indiziert nichts. Aus `liferay-72/configs/` nur die Konfiguration des Konnektors lesen.

## 5. Weg B: aus der Spec

Aus `profile/liferay-72.md`, 1: eingebetteter Knoten, kein Neuaufbau beim Start, App unabhängig vom Index. Reihenfolge:
Knoten prüfen → Neuaufbau → Kontrolle → Einstellung zurück.

## 6. Empfehlung

**Weg B.** Ein Werkzeugschritt ohne Fachlogik.

## 7. Schritte

1. **Knoten prüfen.** Portal mit der aktualisierten Datenbank läuft, der Konnektor meldet den eingebetteten Knoten
   (Protokoll, Control Panel → Suche). Prüfschritt: Zustand grün oder gelb (ein Knoten), kein Fehler im Protokoll.
2. **Indizes neu aufbauen.** Einmalig über Control Panel → Konfiguration → Suche → „Alle Suchindizes neu aufbauen“;
   ohne Oberfläche (Runner) einmalig mit `index.on.startup=true` starten. Dauer messen. Prüfschritt: Protokoll meldet
   das Ende des Neuaufbaus ohne Fehler.
3. **Einstellung zurücksetzen.** `index.on.startup=false` wie in `liferay-72/configs/common/`. Prüfschritt: ein zweiter
   Start baut nicht neu auf (Startzeit, Protokoll).
4. **Kontrolle.** Benutzerliste im Control Panel zeigt Anna, Bernd, Clara, Dora und Emil (Konten aus den Testdaten).
   Prüfschritt: die fünf E-Mails aus `specs/pruefung/testdaten.json` erscheinen.
5. **Keine Rückwirkung auf die App.** Kennzahlen wie in U03, Schritt 10, und Upgrade-Runner mit allen Dateien.
   Prüfschritt: Kennzahlen gleich, alle Upgrade-Fälle grün.
6. **Runner erweitern.** Schritt 4 des Upgrade-Runners führt nach U04 auch Schritt 2 und 3 dieses Playbooks aus.
   Prüfschritt: Laufzeit je Fall notiert (Grundlage für U06).

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| Neuaufbau (Schritt 2, in CI) | ohne Fehler; Dauer notiert |
| Upgrade-Runner mit allen Dateien unter `specs/pruefung/upgrade/` (in CI, Klasse U) | alle Fälle grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „U05: Suchindex nach dem Upgrade neu aufbauen“.
- Draft-PR: Dauer des Neuaufbaus, Speicherbedarf, Ergebnis der Kontrolle. Keine „Bitte bestätigen“, außer der Neuaufbau
  braucht mehr Speicher als `profile/liferay-72.md`, 1, vorsieht.
- Bericht an die Steuerung per `send_message`.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Neuaufbau bricht mit Speicherfehler ab | Heap nach `profile/liferay-72.md`, 1; sonst entfernter Knoten nur in CI (Profil 7.2, Abschnitt 7) |
| Benutzerliste leer, App funktioniert | Index nicht aufgebaut; die App ist nicht betroffen, Schritt 2 wiederholen |
| Jeder Start dauert sehr lange | `index.on.startup` steht noch auf `true` (Schritt 3) |
| Nach dem Neuaufbau ist ein Upgrade-Fall rot | nicht der Index; Ursache in U03 oder U04 suchen, der Neuaufbau ändert keine App-Daten |
