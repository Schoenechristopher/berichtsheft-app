# U02 Code-Upgrade

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-625.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4,
Paket I) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Jeder Teil der 6.2.5-Plugins hat sein Gegenstück in den Workspace-Modulen von `liferay-72/`, und das Modul
`liferay-72/modules/bh-upgrade-625/` steht als Gerüst für U03. Ziel ist der Stand von `liferay-72/` (nach P10 der Reihe
7.2), kein zweiter Code-Stand. Fertig, wenn:

1. Eine Zuordnungstabelle „6.2.5-Teil → 7.2-Modul“ in `liferay-72/upgrade-625/zuordnung.md` deckt alle Teile aus
   `profile/liferay-625.md`, 2.1, ab; jeder Teil hat ein Gegenstück oder eine begründete Lücke unter „Bitte bestätigen“.
2. Die Portlet-IDs aus U00 (`<portlet>_WAR_bhportlet`) sind den Portlet-Namen von 7.2 (`javax.portlet.name`)
   zugeordnet; diese Zuordnung nutzt U03 zum Umschreiben von Seiten, Einstellungen und Rechten.
3. `liferay-72/modules/bh-upgrade-625/` baut (`./gradlew :modules:bh-upgrade-625:build`) mit `bnd.bnd`, einem
   `UpgradeStepRegistrator` und leeren Schritten in der Reihenfolge von U03; die Schritte schreiben noch nichts.
4. `bh-service` legt auf einer aktualisierten Datenbank weder Tabellen an noch führt es das Skript „Schutz in der
   Datenhaltung“ ein zweites Mal aus; der Weg dahin (Release-Eintrag auf Schema `1.0.0`, U03) ist festgelegt
   (`profile/liferay-72.md`, 3.1).
5. Prüffälle: Die Upgrade-Prüffälle unter `specs/pruefung/upgrade/` laufen erst ab U03; U02 bricht keinen Prüffall der
   Reihe 7.2 (P10 der Reihe 7.2 bleibt grün, darunter AK-505-01 bis AK-505-07, AK-508-01 bis AK-508-11 und
   AK-803-01 bis AK-803-05).

Keine Schemaänderung; `service.xml` von `bh-service` bleibt unverändert.

## 2. Voraussetzungen

- U00 abgenommen (Plugins, Portlet-IDs, Theme, Pfade); U01 abgenommen.
- `liferay-72/` ist nach P10 der Reihe 7.2 vollständig; Workspace und Gradle nach `profile/liferay-72.md`, 2.
- Werkzeuge: JDK 11, Gradle-Wrapper des Workspace; in der Sitzung baut Gradle nur, wenn die Target Platform aus Maven
  Central erreichbar ist (`profile/liferay-72.md`, 7).

## 3. Eingaben

- `liferay-72/upgrade-625/bestandsaufnahme.md` (U00).
- `profile/liferay-625.md`, 2.1 (Aufbau des Plugins) und 3 (Bausteine); `profile/liferay-72.md`, 2 (Module), 3
  (Bausteine) und 3.1 (Upgrade-Mechanik); `profile/liferay-gemeinsam.md`, 5 und 6.
- Liferay-Doku: Code-Upgrade von 6.2-Plugins, `UpgradeStepRegistrator`, Umschreiben von Portlet-IDs
  (`BaseUpgradePortletId`) und Übernahme von Release-Einträgen alter Plugins (`BaseUpgradeServiceModuleRelease`).

## 4. Weg A: aus dem Quellcode

Liferays Werkzeug für das Code-Upgrade (Upgrade Planner bzw. `blade`) auf die Quellen von `liferay-625/` anwenden und
das Ergebnis mit `liferay-72/` vergleichen. Lesereihenfolge: `service.xml`, `liferay-portlet.xml`, `liferay-hook.xml`,
`portal.properties`, `service-ext.properties`, dann Pakete unter `de/berichtsheft/`. Nur sinnvoll, wenn `liferay-72/`
fehlt; dann entsteht der Code aber nach der Reihe 7.2, nicht hier.

## 5. Weg B: aus der Spec

Zuordnung aus den Profilen, Reihenfolge der Tabelle:

| 6.2.5 (`profile/liferay-625.md`, 2.1) | 7.2 (`profile/liferay-72.md`, 2) |
| --- | --- |
| `service.xml`, `*LocalServiceImpl`, Finder, Custom SQL | `bh/bh-api`, `bh/bh-service` |
| `upgrade/**` (`UpgradeProcess` mit dem Skript aus gemeinsam 2.6) | `UpgradeStepRegistrator` von `bh-service`, Schritt `0.0.0` → `1.0.0` |
| `model/listener/**` (`service-ext.properties`) | `ModelListener` als DS-Komponenten in `bh-service` |
| `hook/events/**`, `servlet/filter/**`, `portal.properties` | `bh-access` (`LifecycleAction` für `login.events.post` und `servlet.service.events.pre`) |
| `docroot/html/hooks/login/**` (custom-jsp-dir) | Anmeldeseite nach `profile/liferay-72.md`, 3 (Login-Portlet im eigenen Theme) |
| `portlet/**`, `docroot/html/**` | `bh-web` (MVC-Portlets, MVC-Commands, JSPs) |
| `scheduler/**` (`scheduler-entry`) | `bh-notification` (`SchedulerEntry`, `MessageListener`) |
| `notification/**`, `UserNotificationHandler` | `bh-notification` |
| `pdf/**` | `bh-pdf` |
| `clock/**` | `bh-domain` (Schnittstelle), `bh-clock` (OSGi-Dienst) |
| `pruefung/**` (Servlet der Testschnittstelle) | `bh-pruefung` (JAX-RS) |
| `domain/**` | `bh-domain` |
| `themes/bh-theme` (Velocity) | `themes/bh-theme` (FreeMarker, CSS-Variablen) |
| `portal-ext.properties` (eigene Werte `bh.*`) | OSGi-Konfiguration unter `configs/` |
| — | neu: `bh-upgrade-625` (nur für das Upgrade) |

## 6. Empfehlung

**Weg B.** `liferay-72/` ist schon gebaut und geprüft; ein Code-Upgrade der 6.2.5-Quellen erzeugte einen zweiten Stand
derselben App. U02 prüft nur die Vollständigkeit und legt das Upgrade-Modul an.

## 7. Schritte

1. **Zuordnungstabelle schreiben.** Tabelle aus Abschnitt 5 mit den echten Klassen und Dateien aus `liferay-625/` und
   `liferay-72/` füllen. Prüfschritt: jede Zeile aus `profile/liferay-625.md`, 2.1, kommt vor; eine Lücke steht unter
   „Bitte bestätigen“.
2. **Portlet-IDs zuordnen.** Je Portlet aus U00 der Name auf 7.2 (`javax.portlet.name` in `bh-web`). Prüfschritt: Liste
   „alt → neu“ ist vollständig und eindeutig; fehlt ein Portlet auf 7.2, anhalten.
3. **Benachrichtigungs-Typ festhalten.** Typ und Aufbau der Nutzdaten, die `bh-notification` in `UserNotificationEvent`
   schreibt (`profile/liferay-72.md`, 3.5). Prüfschritt: U03 kann mit diesen Angaben Einträge anlegen, die der Handler
   von 7.2 anzeigt.
4. **Theme-Kennung festhalten.** Kennung des 6.2-Themes aus U00 und des 7.2-Themes. Prüfschritt: Eintrag für U04.
5. **Modul `bh-upgrade-625` anlegen.** `build.gradle`, `bnd.bnd` (Bundle-Name, kein `Liferay-Require-SchemaVersion`),
   `UpgradeStepRegistrator` als DS-Komponente unter `liferay-72/modules/bh-upgrade-625/src/main/java/de/berichtsheft/upgrade625/upgrade/`, Schritte als
   leere Klassen in der Reihenfolge von U03 (Schema prüfen, Release übernehmen, Portlet-IDs umschreiben, Glocke). Wie
   Liferay die Schritte eines eigenen Moduls während des Upgrade-Werkzeugs bzw. beim ersten Start ausführt, steht in der
   Liferay-Doku und wird in U03 nachgewiesen. Prüfschritt: `./gradlew :modules:bh-upgrade-625:build` grün.
6. **`bh-service` gegen doppeltes Anlegen sichern.** Festlegen und in `zuordnung.md` beschreiben: Auf einer
   aktualisierten Datenbank steht vor dem ersten Start von `bh-service` ein Release-Eintrag dieses Bundles mit Schema
   `1.0.0` (U03, Schritt „Release übernehmen“). Dann legt Service Builder keine Tabellen an, und der Schritt `0.0.0` →
   `1.0.0` läuft nicht. Zusätzlich bleibt der Ausweg aus `profile/liferay-72.md`, 3.1 (Skript nur, wenn die Trigger im
   Katalog fehlen). Prüfschritt: Beschreibung mit Quelle; Nachweis im laufenden System in U03.
7. **Keine Rückwirkung auf die Reihe 7.2.** Das neue Modul ändert keine bestehenden Module. Prüfschritt:
   `./gradlew build` in `liferay-72/` grün; die Prüffälle der Reihe 7.2 bleiben grün (CI, volle Prüfung der Reihe 7.2).

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-upgrade-625:build` (in `liferay-72/`) | BUILD SUCCESSFUL |
| `./gradlew build` (in `liferay-72/`) | BUILD SUCCESSFUL |
| Prüffälle der Reihe 7.2 (P10 der Reihe 7.2, in CI) | unverändert grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „U02: Zuordnung 6.2.5 → 7.2 und Gerüst bh-upgrade-625“.
- Draft-PR: Zuordnungstabelle, Portlet-IDs alt → neu, Gerüst des Moduls. „Bitte bestätigen“: Lücken der Zuordnung, Weg
  gegen doppeltes Anlegen (Schritt 6). Hinweis: geschützte Pfade (`liferay-72/modules/bh-upgrade-625/**`,
  `liferay-72/upgrade-625/**`, AM-R04), Chris mergt.
- Bericht an die Steuerung per `send_message`.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Gradle findet Artefakte der Target Platform nicht | Liferay-Nexus ist gesperrt (gemeinsam 4.3); Artefakt auf Maven Central suchen, sonst anhalten und melden |
| `bh-upgrade-625` bleibt `INSTALLED` statt `ACTIVE` | ungelöste Imports; Bundle-Zustand im Gogo-Shell prüfen (`lb`, `diag`) |
| Ein 6.2.5-Teil hat kein Gegenstück | nicht in U02 nachbauen; Lücke melden, die Reihe 7.2 ist zuständig |
| Portlet-Namen auf 7.2 enthalten unzulässige Zeichen | Liferay ersetzt Punkte und Bindestriche in Portlet-IDs; die tatsächliche ID aus dem laufenden Portal nehmen |
| Code-Upgrade-Werkzeug erzeugt eine zweite App | Weg A nur auf Auftrag; Ergebnis nicht nach `liferay-72/` übernehmen |
