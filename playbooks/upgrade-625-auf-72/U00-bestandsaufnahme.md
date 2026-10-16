# U00 Bestandsaufnahme

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-625.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4,
Paket I) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Der Bestand der 6.2.5-Umsetzung ist erfasst, der Upgrade-Pfad nach der Liferay-Doku bestätigt, und die Entscheidungen,
die U01 bis U06 brauchen, liegen zur Freigabe vor. Fertig, wenn:

1. `liferay-72/upgrade-625/bestandsaufnahme.md` nennt: Portal-Version und Build-Nummer, Plugins mit Version, eigene
   Tabellen mit Zeilenzahl, Trigger, Constraints und Indizes, die Liferay-Tabellen mit Bezug zur App
   (`User_`, `Role_`, `UserNotificationEvent`, `Release_`, `Layout`, `ResourcePermission`) und die Datenbank-Version.
2. Der Upgrade-Pfad 6.2 → 7.2 ist nach der Liferay-Doku bestätigt (direkt oder mit Zwischenstufe), mit Quelle und
   Abrufdatum.
3. Der Schema-Vergleich der App-Tabellen 6.2.5 gegen eine frische 7.2-Installation zeigt keinen Unterschied
   (`profile/liferay-gemeinsam.md`, Abschnitt 2: gleiche Namen, gleiche Typen). Gibt es einen, hält U00 an (keine
   Schemaänderung in dieser Reihe).
4. Die Pfade aus `profile/liferay-gemeinsam.md`, Abschnitt 6 (`liferay-72/modules/bh-upgrade-625/`,
   `liferay-72/upgrade-625/`), sind bestätigt oder mit Begründung korrigiert.
5. **Entscheidung Glocke** (Schritt 8): Vorschlag mit Kriterien unter „Bitte bestätigen“.
6. Jeder Upgrade-Prüffall unter `specs/pruefung/upgrade/` ist einem Schritt von U01 bis U05 zugeordnet, der ihn grün
   machen muss (Schritt 9). Die Fälle prüfen AK-505 (Schreibschutz der Tage), AK-508 (Versionsstand), AK-803
   (unveränderliche Historie) und weitere AK aus M02, M06 und M08.

Keine Schemaänderung: Das Schema der App-Tabellen ist auf beiden Plattformen gleich
(`profile/liferay-gemeinsam.md`, Abschnitt 2); U00 bestätigt das nur.

## 2. Voraussetzungen

- Abgenommen: P10 der Reihen `playbooks/liferay-625/` und `playbooks/liferay-72/` (beide Umsetzungen vollständig, alle
  Prüffälle grün). Ohne beide hält U00 an.
- Werkzeuge: JDK 8 (6.2.5) und JDK 11 (7.2) nach `profile/liferay-gemeinsam.md`, Abschnitt 4.2; PostgreSQL 16;
  Bundles 6.2.5 GA6 und 7.2.1 GA2 sowie das Tools-Archiv von 7.2.1 GA2 (`…-tools-…`, enthält das Upgrade-Werkzeug)
  nach Abschnitt 4.1.
- Profile: `profile/liferay-gemeinsam.md` Abschnitte 1, 2, 4, 5 und 6; `profile/liferay-625.md` Abschnitte 1, 2.1, 3.1
  und 7; `profile/liferay-72.md` Abschnitte 1, 2, 3.1, 3.5 und 7.
- Sandbox: Liferay-Bundles laufen in der Cloud-Sitzung nicht. Schritte mit laufendem Portal laufen in GitHub Actions
  über die Prüfklasse U (nur `workflow_dispatch`, `docs/ci-richtlinie.md`); die Sitzung schreibt Skripte und
  Auswertung.

## 3. Eingaben

- Architektur: `docs/06-spec-architektur.md`, Abschnitt „Playbooks“ (Tabelle U00–U06) und „Neutrale Prüffälle“
  (Ebene „Upgrade“).
- Gemeinsame Grundlage: `profile/liferay-gemeinsam.md`, Abschnitte 2.3 (Tabellen), 2.4 (Versionsspalte), 2.5 (was
  Liferay ersetzt, Glocke), 2.6 (Skript „Schutz in der Datenhaltung“), 4.1 (Bundles), 5 (geschützte Pfade) und 6.
- Profile: `profile/liferay-625.md`, 3.1 (eigene Glocke im Theme, Wahl des Abbilds gehört zu U00);
  `profile/liferay-72.md`, 3.1 (Upgrade-Mechanik innerhalb von 7.2) und 3.5 (Glocke und Gelesen-Status).
- Prüffälle: `specs/pruefung/upgrade/berichte.json`, `specs/pruefung/upgrade/historie.json`,
  `specs/pruefung/upgrade/version.json`, `specs/pruefung/upgrade/personen.json`,
  `specs/pruefung/upgrade/benachrichtigungen.json`; Format in `specs/pruefung/format.md`, Abschnitt „Aufbau eines
  Upgrade-Falls“.
- Fach-Specs: `specs/M05-status-und-pruefung.md` (AK-505, AK-508), `specs/M06-historie.md` (AK-803),
  `specs/M08-benachrichtigungen-und-erinnerung.md` (M08-R16, Glocke).
- Liferay-Doku zum Upgrade auf 7.2 (Upgrade-Werkzeug, unterstützte Ausgangsversionen); Abruf aus der Sitzung, Quelle
  und Datum notieren.

## 4. Weg A: aus dem Quellcode

Lesereihenfolge: `liferay-625/portlets/bh-portlet/docroot/WEB-INF/service.xml`, `…/liferay-portlet.xml`,
`…/src/portal.properties`, `…/src/portlet.properties`, `…/src/de/berichtsheft/upgrade/**`,
`liferay-625/themes/bh-theme/**`; danach `liferay-72/modules/bh/bh-service/service.xml`, `…/bnd.bnd`, der
`UpgradeStepRegistrator` von `bh-service` und `liferay-72/modules/bh-notification/**` (Handler der Glocke). Aus dem
Quellcode folgt der Ist-Stand: welche Portlet-IDs, welcher Benachrichtigungs-Typ, welche Release-Einträge die
Plugins schreiben.

## 5. Weg B: aus der Spec

Aus `profile/liferay-gemeinsam.md`, Abschnitt 2.3, die Soll-Liste der Tabellen, Trigger und Constraints; aus 2.5 die
Liferay-Tabellen mit Bezug zur App; aus `profile/liferay-625.md` 2.1 und `profile/liferay-72.md` 2 die Plugin- bzw.
Modulstruktur; aus den Upgrade-Prüffällen, was nach dem Upgrade gelten muss. Reihenfolge: Versionen → Plugins →
Tabellen → Liferay-Bezüge → Pfad → Entscheidungen.

## 6. Empfehlung

**Weg B für den Plan, Weg A als Abgleich.** Es gibt keinen Upgrade-Code; Soll-Liste und Prüffälle entstehen aus Spec und
Profilen. Den Ist-Stand liefern die laufende 6.2.5-Instanz (Schritte 1 bis 5) und, wo nötig, ihr Quellcode.

## 7. Schritte

1. **Versionen feststellen.** Auf einer 6.2.5-Instanz mit Testdaten und dem Bestand der Upgrade-Fälle:
   `SELECT servletContextName, buildNumber, schemaVersion FROM Release_ ORDER BY 1;` und `SELECT version();`.
   Prüfschritt: Portal-Eintrag `portal` mit Build-Nummer von 6.2 GA6, Eintrag des Plugins `bh-portlet` mit seiner
   Release-Nummer; PostgreSQL 16.
2. **Plugins und Anpassungen listen.** Inhalt von `deploy/`, `webapps/` und `osgi/` des Bundles (6.2 kennt nur
   `webapps/`), Schlüssel aus `portal-ext.properties`. Prüfschritt: nur `bh-portlet` und `bh-theme` als eigene Plugins,
   kein EXT-Plugin (EXT gibt es auf 7.2 nicht); jede Abweichung in der Bestandsliste.
3. **Eigene Tabellen erfassen.** Zeilenzahl je `BH_`-Tabelle; Schema-Abzug
   `pg_dump --schema-only --table='bh_*' <db> > schema-625.sql`; Trigger aus `pg_trigger`, Constraints aus
   `pg_constraint`. Prüfschritt: alle Tabellen aus gemeinsam 2.3, die Trigger `status_change_no_update`,
   `status_change_no_delete`, `comment_no_update`, `comment_no_delete`, `weekly_report_delete_guard`, `report_day_locked`
   und die CHECK-Constraints mit ihren Namen sind vorhanden.
4. **Schema mit 7.2 vergleichen.** Frische 7.2-Installation (P00 der Reihe 7.2), derselbe Abzug als `schema-72.sql`,
   beide normalisiert (Reihenfolge, Kommentare) und verglichen. Prüfschritt: kein Unterschied. Sonst anhalten und der
   Steuerung melden (fester Grund `schema_abweichend`); U03 gleicht keine Schemaunterschiede aus.
5. **Liferay-Bezüge erfassen.** Liferay-Konten der Testpersonen (`User_` zu den E-Mails aus
   `specs/pruefung/testdaten.json`), Rollen „BH Azubi“ und „BH Ausbilder“ (`Role_`), Seiten der Site „Berichtsheft“
   (`Layout`) mit den Portlet-IDs (Muster `<portlet>_WAR_bhportlet`), Rechte (`ResourcePermission`) dieser Portlets,
   Theme der Site (`LayoutSet.themeId`), Einträge in `UserNotificationEvent` mit dem Typ des Plugins. Prüfschritt: Liste
   der Portlet-IDs und des Theme-Namens für U02 und U04 steht in der Bestandsliste.
6. **Upgrade-Pfad nach Liferay-Doku prüfen.** Nachlesen und mit Quelle festhalten: ob 6.2 direkt auf 7.2 aktualisiert
   werden darf; welche Vorbereitung 6.2 braucht (letzter Stand GA6, Sicherung, Aufräumen); Aufbau des
   Upgrade-Werkzeugs (`portal-tools-db-upgrade-client`: `app-server.properties`, `portal-upgrade-database.properties`,
   `portal-upgrade-ext.properties`); was nicht übernommen wird (Lucene-Index → U05, Velocity-Theme → U04, Plugins aus
   dem Plugins SDK → U02); Einstellung der Dokumentenablage (`dl.store.impl` bzw. OSGi-Konfiguration). Prüfschritt:
   Abschnitt „Upgrade-Pfad“ in der Bestandsliste mit URL und Abrufdatum; jede Angabe ohne Quelle trägt „in U03 zu
   bestätigen“.
7. **Pfade bestätigen.** `liferay-72/modules/bh-upgrade-625/` (Upgrade-Schritte der App-Daten, eigener
   `UpgradeStepRegistrator`) und `liferay-72/upgrade-625/` (Einstellungen des Upgrade-Werkzeugs, Upgrade-Runner,
   Bestandsliste). Prüfschritt: beide Muster stehen in AM-R04 (`docs/07-spec-automatisches-mergen.md`); fehlen sie,
   Hinweis an die Steuerung (die Ergänzung gehört nicht in dieses Paket).
8. **Entscheidung Glocke.** 6.2.5 zeigt eine eigene Glocke im Theme aus `BH_Notification`
   (`profile/liferay-625.md`, 3.1), 7.2 nutzt zusätzlich die Liferay-Glocke über `UserNotificationEvent`
   (`profile/liferay-72.md`, 3.5). Zu entscheiden: Übernimmt U03 Einträge in `UserNotificationEvent`, die 6.2.5 als
   Abbild geschrieben hat (Variante A), oder legt U03 sie aus `BH_Notification` selbst an (Variante B)? Kriterien, je
   mit Befund aus Schritt 5:
   - **K1 Quelle:** `BH_Notification` ist die Quelle, die Glocke ein Abbild (gemeinsam 2.5). Welche Variante leitet das
     Abbild unmittelbar aus der Quelle ab?
   - **K2 Gelesen-Status:** Auf 6.2.5 setzt die eigene Glocke nur `readAt`. Ein Abbild auf 6.2.5 müsste `archived`
     ständig nachziehen, sonst zeigt 7.2 Gelesenes als neu (M08-R16, AK-1015).
   - **K3 Portlet-Bezug:** Ein Eintrag aus 6.2.5 trägt Typ und Nutzdaten des 6.2-Plugins
     (`<portlet>_WAR_bhportlet`). Der Handler auf 7.2 erwartet seine eigenen; U03 müsste die Einträge in jedem Fall
     umschreiben.
   - **K4 Prüfbarkeit auf 6.2.5:** Ein Abbild, das 6.2.5 nie anzeigt, lässt sich dort nur in der Datenbank prüfen.
   - **K5 Wiederholbarkeit:** Der Schritt in U03 muss nach einem Abbruch auf einer neuen Kopie gleich ablaufen.
   - **K6 Aufwand:** zusätzlicher Code auf 6.2.5 (P08 der Reihe 6.2.5) gegen einen Schritt in `bh-upgrade-625`.

   **Vorschlag: Variante B, U03 legt die Einträge selbst an.** K1, K2 und K4 sprechen klar für B; K3 nimmt A den
   einzigen Vorteil, weil U03 die Einträge ohnehin anfassen müsste; K5 erfüllt B ohne Abgleich mit Altbestand; K6 spart
   Code auf 6.2.5. Folgen: Auf 6.2.5 bleibt `userNotificationEventId` leer (Alternative in `profile/liferay-625.md`, 3.1);
   hat 6.2.5 doch Abbilder geschrieben, ersetzt U03 sie (entfernen und neu anlegen). Prüfschritt: Befund zu K1 bis K6 und
   die Zahl der App-Nachrichten mit gesetztem `userNotificationEventId` auf 6.2.5 stehen in der Bestandsliste; der
   Vorschlag steht unter „Bitte bestätigen“ im PR.
9. **Prüffälle zuordnen.** Tabelle „Prüffall-Datei → Schritt, der sie grün macht“: `berichte.json`, `historie.json`,
   `version.json` → U03 (App-Daten unverändert); `personen.json` → U03 und U04 (Konten, Rollen); `benachrichtigungen.json`
   → U03 (Glocke, Ausgangskorb, Erinnerungsvermerk) und U04 (Zeitplan, Mail). Prüfschritt: jede Datei hat mindestens
   einen Schritt; jeder Fall ist mit `node -e` lesbar (Abschnitt 8).
10. **Laufzeit abschätzen.** Dauer des Upgrade-Werkzeugs auf einer kleinen Datenbank (Liferay-Doku bzw. eine Messung in
    CI) mal Zahl der Upgrade-Fälle (je Fall eigener Bestand, `specs/pruefung/format.md`). Prüfschritt: Schätzung und
    Vorschlag zur Parallelität stehen in der Bestandsliste; U06 misst.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |
| `for f in specs/pruefung/upgrade/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" \|\| exit 1; done` | keine Ausgabe, Rückgabe 0 |
| `diff schema-625.sql schema-72.sql` (normalisiert, in CI) | keine Zeile |
| `psql -c "SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY 1"` (6.2.5, in CI) | die sechs Trigger aus Schritt 3 |
| Workflow der Prüfklasse U (`workflow_dispatch`, in CI) | Bestandsliste als Artefakt, nur Testdaten |

## 9. Abschluss

- Commit, z. B. „U00: Bestandsaufnahme 6.2.5 und Upgrade-Pfad“, mit `liferay-72/upgrade-625/bestandsaufnahme.md`.
- Draft-PR: Bestandsliste, Quelle des Upgrade-Pfads, Ergebnis des Schema-Vergleichs, Zuordnung der Prüffälle. „Bitte
  bestätigen“: Entscheidung Glocke (Variante B mit Begründung K1 bis K6), Pfade aus gemeinsam 6, jede Angabe „in U03 zu
  bestätigen“. Hinweis: Liferay läuft nur in CI (Klasse U).
- Bericht an die Steuerung per `send_message`; den Eintrag in `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Schema-Vergleich zeigt Unterschiede in Typen oder Längen | `portlet-model-hints.xml` beider Plattformen vergleichen (gemeinsam 2.1); nicht in U03 ausgleichen, sondern anhalten und melden |
| Trigger fehlen auf 6.2.5 | Upgrade-Schritt „Schutz in der Datenhaltung“ auf 6.2.5 lief nicht (`profile/liferay-625.md`, 3); erst P-Reihe 6.2.5 korrigieren, dann U00 wiederholen |
| Liferay-Doku nicht erreichbar (Proxy) | Websuche mit Quelle; Angabe als „in U03 zu bestätigen“ markieren, nicht raten |
| Ein drittes Plugin oder EXT-Plugin im Bestand | anhalten; die Reihe U deckt nur `bh-portlet` und `bh-theme` ab |
| Portlet-IDs weichen vom Muster ab | echte IDs aus `Layout.typeSettings` übernehmen; U02 braucht die genaue Liste |
| Bestandsliste enthält echte Personendaten | nur die Testpersonen Anna, Bernd, Clara, Dora und Emil; alles andere ist ein Fehler im Bestand |
