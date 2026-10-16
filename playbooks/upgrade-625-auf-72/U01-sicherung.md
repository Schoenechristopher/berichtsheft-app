# U01 Sicherung und Rücksprung

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-625.md` · Stand: 16.10.2026 (Etappe G4, Paket I) · Status:
**Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Datenbank und Dokumentenablage der 6.2.5-Instanz sind vollständig gesichert, und der Rücksprung auf 6.2.5 ist
festgelegt und einmal erprobt. Fertig, wenn:

1. Ein Skript `liferay-72/upgrade-625/sichern.sh` hält 6.2.5 an und legt eine Sicherung an: Datenbank als
   `pg_dump -Fc`, Liferay-Ordner `data/document_library` (bzw. der in U00 festgestellte Ablageort), `portal-ext.properties`,
   die eingesetzten Plugins (`bh-portlet`, `bh-theme`) und eine Datei mit Prüfsummen (SHA-256) und Zeilenzahlen der
   `BH_`-Tabellen.
2. Ein Skript `liferay-72/upgrade-625/ruecksprung.sh` stellt die Sicherung in eine neue Datenbank wieder her und startet
   6.2.5 darauf; ein Probelauf zeigt dieselben Zeilenzahlen, dieselben Trigger und denselben Inhalt der Historie.
3. Der Grundsatz steht fest und ist im Skript erzwungen: **Das Upgrade läuft nie auf der Originaldatenbank**, sondern
   auf einer Kopie der Sicherung (U03). Rücksprung heißt: 6.2.5 wieder auf die unveränderte Originaldatenbank starten.
4. Die Sicherung enthält den Bestand, den die Upgrade-Prüffälle unter `specs/pruefung/upgrade/` vorher herstellen, und
   bewahrt ihn unverändert: Tage und Status (AK-505), Versionsstand (AK-508), Statuswechsel und Kommentare (AK-803).

Keine Schemaänderung.

## 2. Voraussetzungen

- U00 abgenommen (Bestandsliste mit Zeilenzahlen, Ablageort der Dokumente, Plugins).
- Werkzeuge: PostgreSQL 16 mit `pg_dump` und `pg_restore` derselben Hauptversion, `sha256sum`, `tar`.
- Profile: `profile/liferay-gemeinsam.md`, 2.6 (Trigger, Fremdschlüssel) und 4.5 (Datenbank); `profile/liferay-625.md`,
  5.1 (Start) und 7 (Hot Deploy ist asynchron).
- Sandbox: 6.2.5 läuft nur in CI (Klasse U, `docs/ci-richtlinie.md`); Skripte werden in der Sitzung geschrieben und mit
  einer leeren PostgreSQL-Datenbank ohne Portal geprobt (Schritt 7).

## 3. Eingaben

- `liferay-72/upgrade-625/bestandsaufnahme.md` aus U00.
- `profile/liferay-gemeinsam.md`, Abschnitte 2.3, 2.6 und 6.
- Prüffälle: alle Dateien unter `specs/pruefung/upgrade/`, Format in `specs/pruefung/format.md`, „Aufbau eines
  Upgrade-Falls“ (Runner, Schritt 3).
- Liferay-Doku zur Sicherung vor dem Upgrade (Datenbank, Dokumentenablage, Einstellungen).

## 4. Weg A: aus dem Quellcode

Kein eigener Code der App betroffen. Aus dem Quellcode von `liferay-625/` nur: Ablageort und Einstellungen
(`config/portal-ext.beispiel.properties`), damit die Sicherung alle Dateien erfasst.

## 5. Weg B: aus der Spec

Aus gemeinsam 2.6 und 4.5: Was die Datenbank enthält (Tabellen, Trigger, Fremdschlüssel, Indizes) und wie es sich
wiederherstellen lässt; aus U00 der Ablageort. Reihenfolge: anhalten → Datenbank → Dateien → Prüfsummen → Probe.

## 6. Empfehlung

**Weg B.** Die Sicherung hängt nur an Datenbank und Ordnern, nicht an Fachlogik.

## 7. Schritte

1. **6.2.5 anhalten.** Tomcat beenden und warten, bis der Prozess weg ist; vorher keine offenen Sitzungen. Prüfschritt:
   keine Verbindung der App mehr in `pg_stat_activity`; kein Scheduler-Lauf mehr (Ausgangskorb, Erinnerung) kann
   zwischen Sicherung und Upgrade etwas anlegen.
2. **Datenbank sichern.** `pg_dump -Fc -f bh-625.dump <db>` (Schema und Daten in einem Archiv). Prüfschritt:
   `pg_restore -l bh-625.dump` listet die `BH_`-Tabellen und die Trigger im Abschnitt nach den Daten (post-data).
3. **Dateien sichern.** `tar` von `data/document_library`, `portal-ext.properties` und den Plugins; Plugins nur als
   Nachweis des Stands, nicht für 7.2. Prüfschritt: Archiv lässt sich vollständig listen.
4. **Prüfsummen und Kennzahlen.** SHA-256 jeder Datei; Zeilenzahl je `BH_`-Tabelle; je Tabelle ein Hash über die nach
   Primärschlüssel sortierten Zeilen (`SELECT md5(string_agg(t::text, '|' ORDER BY …)) FROM bh_statuschange t`), mindestens
   für `BH_WeeklyReport`, `BH_ReportDay`, `BH_StatusChange`, `BH_Comment`, `BH_Notification`, `BH_Person`. Prüfschritt:
   Werte stehen in `kennzahlen-625.txt` neben der Sicherung; U03 vergleicht dagegen.
5. **Rücksprungweg festlegen.** Die Originaldatenbank bleibt unverändert; U03 arbeitet auf einer Kopie
   (`createdb -T <db> <kopie>` oder `pg_restore` in eine neue Datenbank). Rücksprung: 6.2.5 mit der Originaldatenbank
   und dem gesicherten `portal-ext.properties` starten. Prüfschritt: `sichern.sh` bricht ab, wenn die Zieldatenbank des
   Upgrades gleich der Originaldatenbank ist.
6. **Wiederherstellen erproben.** `ruecksprung.sh`: `pg_restore` in eine neue Datenbank, 6.2.5 darauf starten,
   Kennzahlen neu erheben und mit Schritt 4 vergleichen. Prüfschritt: Zeilenzahlen und Hashes gleich, die sechs Trigger
   vorhanden, die Testschnittstelle von 6.2.5 liest einen Bericht der Upgrade-Fälle mit seiner Historie.
7. **Skripte in der Sitzung proben** (ohne Portal): eine leere PostgreSQL-Datenbank mit einer Tabelle samt Trigger
   anlegen, sichern, wiederherstellen, Kennzahlen vergleichen. Gegenprobe: eine Zeile in der wiederhergestellten
   Datenbank ändern, der Vergleich meldet sie; danach zurücknehmen.
8. **In den Upgrade-Runner einhängen.** `sichern.sh` ist Schritt 3 des Runners (`specs/pruefung/format.md`, „Runner“);
   der Runner sichert je Upgrade-Fall. Prüfschritt: der Runner ruft das Skript mit der Datenbank des Falls auf.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `sh liferay-72/upgrade-625/sichern.sh <db> <ziel>` (in CI) | Archiv, Dateisicherung, `kennzahlen-625.txt`; Rückgabe 0 |
| `sh liferay-72/upgrade-625/ruecksprung.sh <ziel> <neue-db>` (in CI) | 6.2.5 startet, Kennzahlen gleich |
| Probe ohne Portal (Schritt 7, in der Sitzung) | Vergleich grün, Gegenprobe rot |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „U01: Sicherung und Rücksprung für das Upgrade“.
- Draft-PR: Inhalt der Sicherung, Kennzahlen des Probelaufs, Ergebnis des Rücksprungs, Gegenprobe. „Bitte bestätigen“:
  Ablageort der Dokumente, falls er von U00 abweicht. Hinweis: Probe mit Portal nur in CI (Klasse U).
- Bericht an die Steuerung per `send_message`.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Wiederherstellen scheitert an `report_day_locked` oder `BH803` | Daten wurden in ein Schema mit Triggern geladen (`--data-only`). Immer das ganze Archiv wiederherstellen; Trigger entstehen nach den Daten. Nie `--disable-triggers` |
| Fremdschlüssel-Fehler beim Wiederherstellen | Reihenfolge nicht von Hand ändern; `pg_restore` ohne `--section` auf eine leere Datenbank |
| Kennzahlen weichen nach dem Wiederherstellen ab | 6.2.5 lief während der Sicherung weiter (Scheduler); Schritt 1 wiederholen |
| `pg_dump`-Version passt nicht | Werkzeuge der Hauptversion 16 verwenden |
| Dokumentenablage fehlt in der Sicherung | Ablageort aus U00 bzw. `portal-ext.properties` (`dl.store.*`) prüfen |
| Sicherung im Repository | Sicherungen nie committen; nur Skripte und Kennzahlen der Testdaten gehören ins Repository |
