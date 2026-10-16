# U03 Daten-Upgrade

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-625.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4,
Paket I) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Portal-Tabellen sind mit dem Upgrade-Werkzeug von Liferay auf 7.2 gebracht, die App-Tabellen sind unverändert
übernommen, und `bh-upgrade-625` gleicht nur die Liferay-eigenen Unterschiede aus. Fertig, wenn:

1. Die Einstellungen des Upgrade-Werkzeugs liegen unter `liferay-72/upgrade-625/` (`app-server.properties`,
   `portal-upgrade-database.properties`, `portal-upgrade-ext.properties`, ohne Geheimnisse), und ein Skript
   `liferay-72/upgrade-625/upgrade.sh` führt das Upgrade auf einer Kopie der Sicherung aus U01 durch.
2. `bh-upgrade-625` führt seine Schritte in dieser Reihenfolge aus, jeder in einer eigenen Datenbank-Transaktion und
   wiederholbar: Schema prüfen, Release übernehmen, Portlet-IDs umschreiben, Glocke anlegen (Abschnitt 7).
3. Die Kennzahlen aus U01 (Zeilenzahlen und Hashes von `BH_Person`, `BH_WeeklyReport`, `BH_ReportDay`,
   `BH_StatusChange`, `BH_Comment`) sind nach dem Upgrade gleich; bei `BH_Notification` unterscheidet sich höchstens
   `userNotificationEventId`. Die sechs Trigger und alle Constraints sind vorhanden.
4. Der Upgrade-Runner unter `liferay-72/upgrade-625/pruefung/` führt die Upgrade-Prüffälle nach
   `specs/pruefung/format.md`, „Aufbau eines Upgrade-Falls“, aus, und die Fälle aus
   `specs/pruefung/upgrade/berichte.json`, `specs/pruefung/upgrade/historie.json` und
   `specs/pruefung/upgrade/version.json` sind grün: Schreibschutz der Tage (AK-505), Versionsstand (AK-508),
   Statuswechsel und Kommentare unveränderlich (AK-801, AK-802, AK-803).
5. Die Glocke ist nach der Entscheidung aus U00 umgesetzt (Vorschlag Variante B, Abschnitt 7, Schritt 8).

Keine Schemaänderung: U03 legt keine Tabelle und keine Spalte an und ändert keinen Typ. Geschrieben werden nur
Liferay-Tabellen und `BH_Notification.userNotificationEventId`.

## 2. Voraussetzungen

- U00 (Bestand, Schema gleich, Entscheidung Glocke freigegeben), U01 (Sicherung, Rücksprung) und U02 (Zuordnung,
  Gerüst `bh-upgrade-625`) abgenommen.
- Werkzeuge: Bundle 7.2.1 GA2 und das Tools-Archiv 7.2.1 GA2 mit `portal-tools-db-upgrade-client`
  (`profile/liferay-gemeinsam.md`, 4.1), JDK 11, PostgreSQL 16, JDBC-Treiber nach `profile/liferay-72.md`, 1.
- Profile: `profile/liferay-gemeinsam.md`, 2.3 bis 2.6 und 6; `profile/liferay-72.md`, 3.1, 3.5 und 7.
- Sandbox: Upgrade-Werkzeug und Portal laufen nur in CI (Klasse U); die Sitzung schreibt Einstellungen, Schritte,
  Skripte und den Runner und prüft die SQL-Teile gegen eine leere PostgreSQL-Datenbank.

## 3. Eingaben

- `liferay-72/upgrade-625/bestandsaufnahme.md` (U00), `liferay-72/upgrade-625/zuordnung.md` (U02), Skripte aus U01.
- Prüffälle: alle Dateien unter `specs/pruefung/upgrade/`; Format in `specs/pruefung/format.md`.
- Fach-Specs: `specs/M05-status-und-pruefung.md` (AK-505, AK-508, Abschnitt 8), `specs/M06-historie.md` (AK-803),
  `specs/M08-benachrichtigungen-und-erinnerung.md` (M08-R11, M08-R16).
- Liferay-Doku: Upgrade-Werkzeug (Aufruf, Einstellungsdateien, Protokoll), Upgrade eigener Module, Gogo-Befehle
  `upgrade:list`, `upgrade:check`, `upgrade:execute`.

## 4. Weg A: aus dem Quellcode

Lesereihenfolge: `UpgradeProcess` von `liferay-625/` (Skript „Schutz in der Datenhaltung“), `UpgradeStepRegistrator`
von `liferay-72/modules/bh/bh-service/`, `liferay-72/modules/bh-notification/` (wie 7.2 Einträge in
`UserNotificationEvent` anlegt), `liferay-72/modules/bh-upgrade-625/` (Gerüst aus U02). Übernommen wird nur das Muster
der Schritte; das Skript „Schutz in der Datenhaltung“ läuft in U03 nicht erneut.

## 5. Weg B: aus der Spec

Regeln in Bau-Reihenfolge:

1. Gleiches Schema auf beiden Plattformen (`profile/liferay-gemeinsam.md`, 2.1): App-Tabellen werden nicht kopiert,
   umbenannt oder neu angelegt.
2. Historie unveränderlich (M06-R08, AK-803) und Schreibschutz der Tage (M05 Abschnitt 8, AK-505): U03 schreibt keine
   Zeile in `BH_StatusChange`, `BH_Comment` und `BH_ReportDay` und schaltet nie einen Trigger ab.
3. Versionsstand (M05-R20, AK-508, gemeinsam 2.4): `BH_WeeklyReport` bleibt Zeile für Zeile gleich, auch `version` und
   `updatedAt`.
4. Ausgangskorb (M08-R11, AK-1004): `BH_Notification` bleibt die Quelle; Zustand, Versuche und Zeitpunkte bleiben.
5. Glocke (M08-R16, `profile/liferay-72.md`, 3.5): Abbild in `UserNotificationEvent` mit Gelesen-Status aus `readAt`.
6. Kein halber Stand: Ein gescheiterter Lauf wird verworfen und auf einer neuen Kopie wiederholt (U01).

## 6. Empfehlung

**Weg B.** Es gibt keinen Upgrade-Code der App; die Schritte folgen aus den Regeln oben und der Bestandsaufnahme.

## 7. Schritte

1. **Kopie anlegen.** Sicherung aus U01 mit `pg_restore` in eine neue Datenbank laden. Prüfschritt: Kennzahlen gleich
   `kennzahlen-625.txt`; die Originaldatenbank wird nicht verwendet (Skript bricht sonst ab).
2. **Upgrade-Werkzeug einrichten.** Tools-Archiv entpacken; die drei Einstellungsdateien aus `liferay-72/upgrade-625/`
   zeigen auf das 7.2-Bundle, die Kopie und den Ablageort der Dokumente (U00). Zugangsdaten nur aus Umgebungsvariablen
   der CI, Platzhalter im Repository. Prüfschritt: Das Werkzeug startet und verbindet sich (Protokoll).
3. **Portal-Tabellen aktualisieren (Phase 1).** Im `osgi/modules` des 7.2-Bundles liegt außer dem Portal nur
   `bh-upgrade-625`; die übrigen App-Module noch nicht. Upgrade-Werkzeug ausführen, Protokoll sichern. Prüfschritt:
   Protokoll endet ohne Fehler; `upgrade:check` in der Gogo-Shell meldet keine offenen Schritte des Portals.
4. **Schema prüfen** (erster Schritt von `bh-upgrade-625`). Katalog gegen die Soll-Liste aus gemeinsam 2.3 und 2.6
   (Tabellen, Spalten, Typen, Trigger, Constraints, Indizes). Weicht etwas ab, endet der Schritt mit dem festen Grund
   `schema_abweichend` und ändert nichts. Prüfschritt: Gegenprobe auf einer Kopie ohne den Trigger
   `report_day_locked` scheitert mit diesem Grund.
5. **Release übernehmen.** Der Release-Eintrag des Plugins `bh-portlet` wird zum Eintrag des Bundles von `bh-service`
   mit Schema `1.0.0` (Liferay-Muster `BaseUpgradeServiceModuleRelease`; ob es auf 7.2 so heißt und greift, hier
   nachweisen). Prüfschritt: `SELECT servletContextName, schemaVersion FROM Release_` zeigt das Bundle von
   `bh-service` mit `1.0.0`; der alte Eintrag ist ersetzt.
6. **Portlet-IDs umschreiben.** Mit der Liste aus U02 (Liferay-Muster `BaseUpgradePortletId`): Seiten, Einstellungen der
   Portlets und Rechte (`ResourcePermission`) zeigen auf die Portlet-Namen von 7.2. Prüfschritt: keine Zeile mit
   `_WAR_bhportlet` mehr in `Layout.typeSettings`, `PortletPreferences` und `ResourcePermission`.
7. **Konten und Rollen nicht anfassen.** `User_` und `Role_` übernimmt das Upgrade-Werkzeug; `BH_Person.userId` zeigt
   weiter auf denselben Benutzer, die Rollen „BH Azubi“ und „BH Ausbilder“ bleiben. Prüfschritt: Abfrage
   `BH_Person` ⋈ `User_` über `userId` liefert für jede gebundene Person ihre E-Mail aus den Testdaten.
8. **Glocke anlegen** (Vorschlag Variante B aus U00, sofern freigegeben). Begründung (U00, Schritt 8): Das Abbild
   entsteht unmittelbar aus der Quelle `BH_Notification` (K1), der Gelesen-Status kommt aus `readAt` statt aus einem auf
   6.2.5 nie angezeigten Abbild (K2, K4), und Einträge aus 6.2.5 müssten wegen Typ und Nutzdaten des 6.2-Plugins
   ohnehin umgeschrieben werden (K3). Gilt die Freigabe für Variante A, entfällt das Anlegen; dann schreibt dieser
   Schritt nur Typ und Nutzdaten der vorhandenen Einträge um und gleicht `archived` mit `readAt` ab. Für jede Zeile von
   `BH_Notification` mit Kanal `APP`, deren Empfänger an einen Liferay-Benutzer gebunden ist:
   - vorhandenen Eintrag aus `userNotificationEventId` entfernen (nur falls 6.2.5 doch Abbilder geschrieben hat);
   - neuen Eintrag in `UserNotificationEvent` über `UserNotificationEventLocalService` anlegen: Empfänger `userId`,
     Zeitpunkt `createdAt`, Typ und Nutzdaten wie `bh-notification` (U02, Schritt 3), `archived` gesetzt genau dann,
     wenn `readAt` gesetzt ist;
   - dessen ID in `userNotificationEventId` merken.

   Ungebundene Empfänger bekommen kein Abbild, wie im laufenden Betrieb von 7.2 (`bh-notification`). Alles in einer
   Transaktion; ein zweiter Lauf auf derselben Kopie ergibt denselben Stand. Prüfschritt: Zahl der Einträge gleich der
   Zahl der App-Nachrichten gebundener Empfänger; Zahl mit `archived` gleich Zahl mit `readAt`.
9. **App-Module einsetzen (Phase 2).** Alle Module und das Theme aus `liferay-72/` ins Bundle, Portal mit der Kopie
   starten. Prüfschritt: alle Bundles `ACTIVE`; `upgrade:check` leer; im Protokoll legt `bh-service` keine Tabelle an
   und führt das Skript „Schutz in der Datenhaltung“ nicht aus.
10. **Daten vergleichen.** Kennzahlen wie in U01, Schritt 4, erheben und mit `kennzahlen-625.txt` vergleichen.
    Prüfschritt: gleich für die fünf Tabellen aus Abschnitt 1; bei `BH_Notification` nur `userNotificationEventId`
    verschieden; die sechs Trigger vorhanden.
11. **Upgrade-Runner anlegen.** Unter `liferay-72/upgrade-625/pruefung/` ein Runner nach `specs/pruefung/format.md`,
    „Aufbau eines Upgrade-Falls“: je Fall leere 6.2.5-Instanz, `vorher` über die Testschnittstelle von 6.2.5
    (`profile/liferay-625.md`, 4.2), Sicherung (U01), Schritte 1 bis 10 dieses Playbooks, `nachher` über die
    Testschnittstelle von 7.2 (`profile/liferay-72.md`, 4). Der Runner merkt sich gesehene Stände (`"vorher:<n>"`)
    auf 6.2.5 und zählt Übergaben an den Test-Kanal über beide Plattformen. Ein Fall mit abweichendem
    `vorher.ergebnisse` ist fehlerhaft, nie grün; ein Fall ohne Runner-Unterstützung lässt den Lauf scheitern.
    Prüfschritt: die Fälle der Ebene `upgrade` erscheinen mit ihrer ID als Testfälle.
12. **Prüffälle für U03 ausführen.** Runner mit `berichte.json`, `historie.json` und `version.json`. Prüfschritt: grün.
    Gegenprobe: ein Schritt, der `version` auf `0` setzt, macht die Fälle aus `version.json` rot; danach zurücknehmen.

Bei jedem Fehler in Schritt 3 bis 10: Kopie verwerfen, Ursache beheben, mit Schritt 1 neu beginnen. Nie auf einer halb
aktualisierten Datenbank weiterarbeiten.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `sh liferay-72/upgrade-625/upgrade.sh <sicherung>` (in CI) | Phase 1 und 2 ohne Fehler, Kennzahlen gleich |
| Gogo-Shell `upgrade:check` (in CI) | keine offenen Schritte |
| Upgrade-Runner mit `berichte.json`, `historie.json`, `version.json` (in CI, Klasse U) | alle Fälle grün |
| `./gradlew :modules:bh-upgrade-625:test` (Schritte ohne Portal, soweit möglich) | grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „U03: Daten-Upgrade mit bh-upgrade-625 und Upgrade-Runner“.
- Draft-PR: Protokollauszug, Kennzahlen vorher/nachher, Ergebnis der Upgrade-Prüffälle mit IDs, Gegenproben. „Bitte
  bestätigen“: jede Liferay-Angabe, die erst hier nachgewiesen wurde (Release-Übernahme, Portlet-IDs, Ausführung der
  Modul-Schritte im Upgrade-Werkzeug), und die Umsetzung der Glocke. Geschützte Pfade, Chris mergt.
- Bericht an die Steuerung per `send_message` mit Laufzeit je Fall.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| `bh-service` versucht `CREATE TABLE` und scheitert | Release-Eintrag fehlt oder kam zu spät; Schritt 5 vor Phase 2 nachweisen, sonst Reihenfolge der Bundles prüfen |
| Ein Schritt scheitert mit `BH803` oder an `report_day_locked` | Der Schritt schreibt Historie oder Tage; das ist nie erlaubt. Schritt ändern, Trigger nie abschalten |
| Zeitpunkte der Historie um ein bis zwei Stunden verschoben | Verbindung nicht in UTC oder JVM nicht in GMT (gemeinsam 2.2); Kennzahlen-Hash zeigt es, Fälle aus `historie.json` ebenso |
| `inzwischen_geaendert` in `version.json` | `version` wurde verändert oder zurückgesetzt; `BH_WeeklyReport` darf U03 nicht schreiben |
| Gelesene Nachrichten erscheinen in der Liferay-Glocke als neu | `archived` nicht aus `readAt` gesetzt (Schritt 8) |
| Upgrade-Werkzeug bricht mitten in Phase 1 ab | Kopie verwerfen, neu aus der Sicherung; nie fortsetzen |
| Speicher reicht auf dem Runner nicht | Heap nach `profile/liferay-72.md`, 1, Fälle seriell statt parallel |
