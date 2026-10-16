# P00 Grundgerüst

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket H) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Ein leerer Liferay Workspace baut, das Bundle 7.2.1 GA2 startet mit PostgreSQL und eingebettetem Suchdienst, die
Prüf-Adapter der drei Ebenen laufen, die Testdaten sind eingelesen, und Speicher und Laufzeit sind gemessen. Fertig, wenn:

1. `./gradlew build` (aus `liferay-72/`) läuft grün, noch ohne Fachcode, mit den Platzhaltertests aus Schritt 12.
2. Das Bundle startet mit OpenJDK 11, PostgreSQL 16 (Datenbank `berichtsheft_l72`) und JDBC-Treiber 42.7.14; das Log meldet
   „Server startup in“, alle Bundles `de.berichtsheft.*` sind `ACTIVE`, der eingebettete Elasticsearch-Knoten läuft in der
   Betriebsart `EMBEDDED`.
3. Die Prüf-Adapter der drei Ebenen (Fachlogik, Daten, Ablauf) sind angelegt und laden alle Dateien aus `specs/pruefung/`.
   Sie führen die Fälle der gebauten Module aus (Bau-Stand, Schritt 12); alle anderen Fälle erscheinen sichtbar als „noch
   nicht gebaut“, nie still übersprungen. Ein Fall mit `"abweichend": { "liferay-72": … }` erscheint getrennt als
   „abweichend, begründet“, nie als grün. Eine Ebene ohne Runner lässt den Lauf scheitern.
4. Die Testschnittstelle `/o/bh-pruefung/` antwortet bei `bh.betrieb=test` und gibt bei `bh.betrieb=produktion` 404
   (Gegenprobe, Schritt 13); die Uhr ist nur bei `bh.betrieb=test` stellbar.
5. `specs/pruefung/testdaten.json` (Anna, Bernd, Clara, Dora, Emil) ist lesbar und in einem JUnit-Test geprüft.
6. Speicher und Laufzeit sind gemessen (Bundle-Start, Build, Testlauf; Schritt 15) und als Zahlen im PR; daraus folgen Heap,
   Zeitlimit und Aufteilung des CI-Jobs der Klasse L72 (Schritt 16).
7. Die Liste „In P00 zu bestätigen“ des Profils ist abgearbeitet: jeder Punkt bestätigt, mit Ausweg gelöst oder unter
   „Bitte bestätigen“ gemeldet (Schritt 17).

Dieses Playbook gehört keinem Fach-Modul und nennt deshalb keine AK-IDs als Fertig-Kriterium; ab P01 hängt jedes Playbook an
den AK-IDs seines Moduls. Die Zugangsprüfung der Plattform (Uhr und Testdaten nur außerhalb des Produktivbetriebs) wird in
P10 abgenommen.

## 2. Voraussetzungen

- Keine fertigen Playbooks dieser Reihe. P00 ist das erste Paket und blockiert P01 bis P10 (`playbooks/00-steuerung.md`,
  Abschnitt 2). Die TypeScript-App ist die Referenz und bleibt unverändert.
- Freigabe der Profile `profile/liferay-72.md` und `profile/liferay-gemeinsam.md` durch Chris, mindestens der Punkte unter
  „Bitte bestätigen“, die P00 berührt (Paketwurzel, Jackson, Mail synchron, Testnamen, Suchdienst eingebettet).
- Werkzeuge: OpenJDK 11 (gemeinsam 4.2), PostgreSQL 16 mit Rolle `berichtsheft` (aus dem Startskript der TypeScript-App),
  Node.js und Playwright-Chromium der Sitzung, Netz zu SourceForge und Maven Central (gemeinsam 4.6).
- **Grenze der Cloud-Sitzung:** Container starten nicht (`CLAUDE.md`). Das Bundle (653 MB) lädt eine Sitzung nur, wenn der
  Auftrag es ausdrücklich verlangt; die Schritte 2 bis 6 beschreiben den Weg, der vollständige Lauf mit Firefox und Edge
  findet in GitHub Actions statt.
- Ein Branch, z. B. `claude/l72-p00-grundgeruest`, und ein Draft-PR (`CLAUDE.md`, „Arbeitsweise“).

## 3. Eingaben

- Profil: `profile/liferay-72.md`, Abschnitte 1 bis 7 und „In P00 zu bestätigen“; `profile/liferay-gemeinsam.md`,
  Abschnitte 2.4, 2.6, 3, 4.1, 4.2, 4.4, 4.6, 5 und 7.
- Fach-Specs: `specs/00-uebersicht.md` (Module, Lesereihenfolge), `specs/Q-plattform-und-qualitaet.md`, Abschnitt 8
  (Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/format.md` (Aufbau, „Regeln für Adapter“, „Abweichend, begründet“),
  `specs/pruefung/testdaten.json`.
- Vorgaben: `CLAUDE.md` (Cloud-Sitzungen), `docs/ci-richtlinie.md` (Abschnitt 7, Klasse L72), `docs/02-plan.md`.
- Gegenstücke der Referenz (nur lesen): `src/app/api/test/zustand/route.ts` (Testschnittstelle), `e2e/pruefung/ablauf-adapter.ts`
  und `e2e/pruefung/ablauf-pruefungen.ts` (Ablauf-Adapter), `tests/db/timezone.test.ts` (Zeitzone).

## 4. Weg A: aus dem Quellcode

Nicht anwendbar: Für Liferay 7.2 gibt es keinen Quellcode der Referenz. Aus der TypeScript-App lassen sich nur die
plattformneutralen Teile übernehmen: die Logik des Ablauf-Adapters (`e2e/pruefung/ablauf-adapter.ts`) und die allgemeinen
Prüfungen (`e2e/pruefung/ablauf-pruefungen.ts`) unverändert, die Testschnittstelle als Vorbild für Aktionen und
Antwortform. Das ist Teil von Weg B (Schritt 11), kein eigener Weg.

## 5. Weg B: aus der Spec

Bau-Reihenfolge des Gerüsts:

1. JDK 11 und Bundle nach gemeinsam 4.1 und 4.2, Datenbank `berichtsheft_l72`.
2. Liferay Workspace `liferay-72/` mit Target Platform 7.2.1 und Konfigurationen `configs/common|local|ci|prod`
   (Profil, Abschnitt 2).
3. Suchdienst eingebettet nach gemeinsam 4.4 (Profil, Abschnitt 1).
4. Module ohne Fachcode: `bh-domain` (Uhr-Schnittstelle, Prüf-Adapter Fachlogik), `bh-clock`, `bh/bh-api` und
   `bh/bh-service` (leeres `service.xml` mit Namespace `BH`, Upgrade-Schritt `0.0.0` → `1.0.0`), `bh-pruefung`
   (Testschnittstelle), `bh-test-integration` (Arquillian, Daten-Adapter), `pruefung/` (Ablauf-Adapter), dazu die leeren
   Module `bh-access`, `bh-web`, `bh-notification`, `bh-pdf` und das Theme `bh-theme`.
5. Prüfungen im Build (Systemzeit nur in `ClockImpl`, Bundle-Zustände), Messung, Vorschlag für den CI-Job.

Paketwurzel aller Java-Quellen ist `de.berichtsheft` (Profil, Abschnitt 2), Code-Bezeichner englisch, Oberfläche deutsch.
Für das Gerüst gibt es keine Akzeptanzkriterien; die Regeln der Plattform dazu (Q, Abschnitt 8 „Prüfbarkeit“) werden in
P10 abgenommen.

## 6. Empfehlung

**Weg B.** Es gibt keinen Liferay-Quellcode der Referenz, und das Gerüst hängt an keiner Fachregel. Wichtiger als die
Reihenfolge ist, dass jede Annahme des Profils im laufenden System bestätigt oder als Befund gemeldet wird (Schritt 17).

### Aufbau der Reihe (gilt für P01 bis P10)

- Dateiname und Kurzname wie in `playbooks/typescript/` (`P05-status-und-pruefung.md` …); Kopfzeile mit Reihe, Plattform,
  Profil und Stand wie hier.
- Branch `claude/l72-pNN-<kurzname>`; alle Befehle aus `liferay-72/`, außer Playwright (aus der Wurzel des Repositorys).
- Abschnitt 5 hat je Modul eine AK-Tabelle mit **jeder** AK-ID einzeln (Kurzfassung, Zahl der Prüffälle je Ebene, Datei);
  Abweichungen stehen in einer eigenen Spalte „Bewertung auf 7.2“ (gleichwertig bzw. **abweichend, begründet** mit
  Prüffall-ID und Verweis auf das Profil).
- Fachlogik in `bh-domain` (Java 8, keine Liferay-Abhängigkeit, Paket `de.berichtsheft.domain.<bereich>`), Service in
  `bh/bh-service` (`*LocalServiceImpl` prüft Rolle und Besitz selbst), Oberfläche in `bh-web`; „jetzt“ nur aus `Clock`.
- Plattformeigene JUnit-Tests beginnen mit der AK-ID ohne Bindestrich (`AK505_…`), Prüffall-Tests tragen die ID
  unverändert (`AK-505-01`); Berichte nennen die AK-ID mit Bindestrich (Profil, Abschnitt 4).
- Jede Prüfung, die ein Playbook baut, bekommt eine **wirksame Gegenprobe**: ein benannter, absichtlich eingebauter Fehler
  und die benannten Prüffälle bzw. Tests, die er rot macht; danach zurücknehmen.
- Abschnitt 8 nennt mindestens: Fachlogik-Adapter des Moduls, Daten-Adapter des Moduls, plattformeigene Tests,
  Ablauf-Fälle in Chromium und 375 px, `./gradlew build` und die Playbook-Prüfung.

## 7. Schritte

1. **Bestand prüfen.** `ls -a` im Wurzelordner, `git status`, `java -version`, `psql --version`, `node --version`.
   Prüfschritt: Liste vorhanden/fehlend notiert; `liferay-72/` fehlt (erwarteter Ausgangspunkt), Java 21 ist vorinstalliert
   und passt nicht (gemeinsam 4.2).
2. **JDK 11** nach gemeinsam 4.2: `apt-get update && apt-get install -y openjdk-11-jdk-headless` (Ubuntu-Archiv;
   `apt-cache policy` kennt das Paket erst nach `apt-get update`), `JAVA_HOME` auf das JDK 11 für alle Gradle- und
   Tomcat-Aufrufe, Java 21 bleibt Standard der Sitzung. In CI `eclipse-temurin:11-jdk` bzw. `actions/setup-java` mit 11.
   Prüfschritt: `$JAVA_HOME/bin/java -version` meldet 11.
3. **Bundle** nach gemeinsam 4.1: das Tomcat-Bundle 7.2.1 GA2 von SourceForge (Dateiname und Größe dort, 653.414.508 Byte)
   einmal nach `/opt/liferay-72-bundle/` laden, nie ins Repository; Prüfsumme notieren. In `liferay-72/gradle-local.properties`
   (nicht committet) `liferay.workspace.bundle.url=file:///opt/liferay-72-bundle/<archiv>`; das Liferay-CDN ist gesperrt.
   Prüfschritt: Größe des Archivs stimmt; `gradle-local.properties` und `bundles/` stehen in `liferay-72/.gitignore`.
4. **Workspace** `liferay-72/` nach Profil, Abschnitt 2: `settings.gradle` mit dem Workspace-Plugin von Maven Central (die
   letzte Version, die 7.2 noch kann, hier ermitteln), `gradle.properties` mit `liferay.workspace.product=portal-7.2-ga2`
   und Target Platform 7.2.1 (`release.portal.bom` 7.2.1), `node.download=false`, Gradle-Wrapper. Kein Liferay-Nexus.
   Prüfschritt: `./gradlew tasks` löst alle Abhängigkeiten aus Maven Central auf; fehlt ein Artefakt, **anhalten und melden**
   (Profil, Abschnitt 7).
5. **Bundle einrichten und Treiber tauschen.** `./gradlew initBundle`; JDBC-Treiber 42.7.14 (gemeinsam 7) nach
   `bundles/tomcat-9.0.x/lib/ext/`, den alten Treiber des Bundles entfernen; Datenbank `berichtsheft_l72` mit Rolle
   `berichtsheft` anlegen (nicht die Datenbanken der TypeScript-App). `configs/local/portal-ext.properties`: JDBC auf
   `localhost`, Zeitzone UTC (`-Duser.timezone=GMT` in `setenv.sh`, gemeinsam 2.2), `index.on.startup=false`, SMTP-Mock unter
   `mail.session.mail.smtp.*` (gemeinsam 3.2); `configs/local/osgi/configs/` mit `bh.betrieb=test`. Prüfschritt: Treiber im
   Bundle ist 42.7.14; `configs/` enthält nur Platzhalter, keine Geheimnisse.
6. **Suchdienst eingebettet** nach gemeinsam 4.4 (in Sitzung und CI gleich):
   `configs/common/osgi/configs/com.liferay.portal.search.elasticsearch6.configuration.ElasticsearchConfiguration.config`
   mit `operationMode="EMBEDDED"` und festem `clusterName`. Kein eigener Elasticsearch-Dienst, kein Docker-Image in der
   Sitzung. Prüfschritt: nach dem Start (Schritt 7) antwortet `curl -s localhost:9200` mit dem Clusternamen; Version des
   eingebetteten Knotens notieren; im Log keine Sidecar-Betriebsart (Profil, Abschnitt 1).
7. **Erster Start.** `JAVA_TOOL_OPTIONS= TZ=Europe/Berlin bundles/tomcat-9.0.x/bin/catalina.sh run` im Hintergrund mit
   Protokoll (Profil, Abschnitt 5); bereit bei „Server startup in“. Heap vorläufig nach Profil, Abschnitt 1 (`-Xmx3g`,
   Voreinstellung in `setenv.sh` prüfen). Prüfschritt: Startseite antwortet mit 200; `pg_stat_activity` zeigt Verbindungen auf
   `berichtsheft_l72`; Zeit bis „Server startup in“ notieren (Messung, Schritt 15).
8. **Module anlegen** (Paketwurzel `de.berichtsheft`): `bh-domain` als reines Java-8-Projekt ohne Liferay-Abhängigkeit mit
   der Schnittstelle `Clock` (Paket `de.berichtsheft.domain.clock`); `bh-clock` mit `ClockImpl` und `ClockControl` nach
   Profil 3.2, `BetriebConfiguration` mit `@Meta.AD(deflt = "produktion")`; `bh/bh-api` und `bh/bh-service` mit `service.xml`
   (`dependency-injector="ds"`, `namespace` `BH`, noch ohne Entity); leere Module `bh-access`, `bh-web`, `bh-notification`,
   `bh-pdf`, Theme `bh-theme`. Prüfschritt: `./gradlew build deploy`; im Log „STARTED de.berichtsheft…“ für jedes Modul; in
   der Gogo-Shell kein Bundle in `INSTALLED` (ungelöste Imports, Profil, Abschnitt 7).
9. **Upgrade-Schritt und Schutz in der Datenhaltung** nach Profil 3.1 und gemeinsam 2.6: `UpgradeStepRegistrator` in
   `bh-service` mit dem Schritt `0.0.0` → `1.0.0`, `bnd.bnd` mit `Liferay-Require-SchemaVersion: 1.0.0`. Das Skript „Schutz in
   der Datenhaltung“ ist hier noch leer; es wächst mit den Tabellen in P02, P03, P05, P06 und P08. Bestätigen, ob 7.2 bei
   frischer Installation die Tabellen von Service Builder vor dem Schritt anlegt und den Schritt ausführt (Profil 3.1); sonst
   der Ausweg dort (Prüfung im Katalog `pg_trigger`). Prüfschritt: Eine Probe-Entity mit einem Probe-Trigger zeigt die
   Reihenfolge; danach Probe entfernen und Datenbank neu anlegen.
10. **Testschnittstelle `bh-pruefung`** (Profil, Abschnitt 4): JAX-RS unter `/o/bh-pruefung/` mit Uhr stellen, Bestand leeren,
    Testdaten laden; Komponente mit `ConfigurationPolicy.REQUIRE`, registriert nur bei `bh.betrieb=test`. Die Daten-Aktionen
    der Module kommen ab P01 dazu. Prüfschritt: `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8080/o/bh-pruefung/zustand`
    liefert 200 bei `test`.
11. **Ablauf-Adapter `pruefung/`.** `pruefung/playwright.config.ts` mit den Projekten `chromium` und `smartphone-375` für die
    Sitzung, `firefox` und `msedge` nur in CI; übernimmt `e2e/pruefung/ablauf-pruefungen.ts` unverändert und die Logik von
    `e2e/pruefung/ablauf-adapter.ts` mit Selektoren über die festen Merker; die Aktion `anmelden` füllt das Login-Portlet von
    Liferay mit den Platzhalter-Zugangsdaten der Testperson. Ob der TypeScript-Adapter in einen gemeinsamen Teil geteilt wird,
    entscheidet die Steuerung (Änderung außerhalb von `liferay-72/`, eigener Auftrag). Prüfschritt:
    `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --list` findet die Ablauf-Fälle.
12. **Prüf-Adapter Fachlogik und Daten, Bau-Stand.** `FachlogikPrueffaelleTest` (JUnit 4.13.2, parametrisiert, Jackson
    Databind 2.12.7.2 **nur** als `testImplementation`, gemeinsam 7) liest `specs/pruefung/*.json` außer `testdaten.json` über
    die Systemeigenschaft `bh.pruefung.dir`, filtert `ebene = fachlogik` und ruft je `schnittstelle` die Fachlogik.
    `DatenPrueffaelleTest` in `bh-test-integration` läuft außerhalb von OSGi gegen die Testschnittstelle (HTTP). Je Prüffall ein
    Testfall mit der Prüffall-ID im Namen. **Bau-Stand:** eine Liste der gebauten Module (anfangs leer) und der
    zurückgestellten Fälle, gemeinsam für beide Runner; ungebaute und zurückgestellte Fälle werden als Assumption „noch nicht
    gebaut“ gemeldet und getrennt gezählt, Fälle mit `abweichend.liferay-72` als Assumption „abweichend, begründet“ mit Verweis.
    Zurückgestellt sind wie in der Referenz AK-305-09 bis P04 und AK-205-01, AK-205-02 bis P08. Jedes Playbook P01 bis P09
    trägt am Ende sein Modul ein; P10 löscht beide Listen. Prüfschritt: `./gradlew :modules:bh-domain:test` meldet alle Fälle
    als „noch nicht gebaut“, keinen roten; Testdaten-Test (fünf Personen, Anna, Bernd und Clara `angelegt`, Dora und Emil
    nicht) grün.
13. **Gegenproben des Gerüsts.**
    - Testschnittstelle: `bh.betrieb=produktion` setzen → `/o/bh-pruefung/zustand` antwortet 404, `ClockControl.setFixed`
      wirft; zurück auf `test`.
    - Fachlogik-Adapter: ein Modul ohne Umsetzung in den Bau-Stand eintragen → dessen Fälle werden rot; zurücknehmen.
    - Systemzeit: die Prüfung im Build (Profil 3.2) meldet einen absichtlich eingebauten Aufruf von `Instant.now()` in
      `bh-domain`; zurücknehmen.
    Prüfschritt: drei rote Läufe gesehen und im PR notiert, danach alles grün.
14. **Zeitzone.** Integrationstest „Zeitpunkte unabhängig von der Server-Zeitzone“ (Profil, Abschnitt 4) mit `TZ=Europe/Berlin`
    und `-Duser.timezone=GMT`: ein Zeitpunkt wird über eine Probe-Tabelle geschrieben und in UTC zurückgelesen. Der
    vollständige Test auf `BH_StatusChange` entsteht in P06. Prüfschritt: grün; Gegenprobe ohne `-Duser.timezone=GMT` rot.
15. **Messung von Speicher und Laufzeit.** In der Sitzung (wenn das Bundle geladen ist) und auf dem Standard-Runner (4 Kerne,
    16 GB, 14 GB SSD), je dreimal, Mittelwert und Höchstwert:

    | Größe | Messweg |
    | --- | --- |
    | Bundle-Start | Zeit vom Aufruf von `catalina.sh` bis „Server startup in“ und bis alle Bundles `de.berichtsheft.*` aktiv sind |
    | Build | `/usr/bin/time -v ./gradlew build` (kalt ohne Gradle-Cache und warm): Wandzeit, höchster Speicher (Maximum resident set size) |
    | Testlauf | Wandzeit von `./gradlew :modules:bh-domain:test`, `./gradlew :modules:bh-test-integration:testIntegration` und des Ablauf-Runners (Chromium, 375 px) |
    | Speicher des Portals | höchster Wert `VmHWM` aus `/proc/<pid>/status` der Tomcat-JVM, Heap mit `jcmd <pid> GC.heap_info`, mit eingebettetem Elasticsearch |
    | Speicher gesamt | `free -m` während des Testlaufs (Portal, PostgreSQL, Node, Browser) |
    | Platte | `du -sh bundles/ bundles/data/elasticsearch6` nach dem Testlauf |

    Prüfschritt: Tabelle mit Zahlen im PR; Heap-Einstellung (`-Xmx`) danach festgelegt. Reicht der Speicher nicht: Heap senken,
    Firefox und Edge in getrennte Jobs, sonst entfernter Knoten als Dienst-Container (Profil, Abschnitt 7).
16. **CI-Klasse L72** nach `docs/ci-richtlinie.md` (Abschnitt 7, Klassentabelle: L72 `liferay-72/**`, Job „Liferay 7.2“):
    Vorschlag für den Job mit den Messwerten aus Schritt 15: nur bei Änderungen unter `liferay-72/` und erst bei „bereit“; JDK 11
    und Node, Bundle aus dem Actions-Cache (Schlüssel: URL und Prüfsumme des Archivs), PostgreSQL als Dienst-Container,
    eingebetteter Suchdienst wie in der Sitzung, `./gradlew build deploy`, Portal starten, alle Prüf-Adapter, Playwright mit
    Chromium, Firefox, Edge und 375 px; Zeitlimit aus der Messung (höchstens 60 Minuten), Logs und Screenshots als Artefakt (nur
    Testdaten), keine Geheimnisse. Dazu ein Vorschlag für die schnelle Prüfung (`./gradlew build` mit dem Fachlogik-Adapter,
    ohne Bundle). Der Workflow liegt unter `.github/**` (Klasse I, geschützt) und entsteht in einem eigenen, freigegebenen
    Auftrag; P00 liefert den Entwurf im PR. Prüfschritt: Vorschlag im PR unter „Bitte bestätigen“.
17. **Profil bestätigen.** Jeden Punkt aus `profile/liferay-72.md`, „In P00 zu bestätigen“, mit Befund abhaken, darunter: Bundle
    mit JDK 11, PostgreSQL 16 und JDBC 42.7.14; Version des eingebetteten Elasticsearch und keine Sidecar-Betriebsart;
    Workspace-Plugin und Gradle; `liferay-theme-tasks` und Node ohne Download; Service Builder mit `dependency-injector="ds"`
    (Custom SQL, `@Transactional`, `mvcc-enabled="false"`, `remote-service="false"`); Signatur von
    `BaseModelListener.onBeforeUpdate`/`onBeforeRemove`; `SQLQuery.executeUpdate()` und `clearCache`; die drei
    `LifecycleAction`-Schlüssel; `TemplateContextContributor` und Senna aus; Scheduler (`SchedulerEngineHelper`,
    `StorageType.MEMORY_CLUSTERED`, Takt); synchroner Mailversand über die `javax.mail.Session` des Portals (ein Probeversand an
    den SMTP-Mock liefert Erfolg bzw. Fehler sofort zurück, nicht über den Message Bus); Gelesen-Markieren über die
    Liferay-Glocke erreicht einen `ModelListener<UserNotificationEvent>` (Profil 3.5); PDFBox per `compileInclude`;
    Liferay-Arquillian 1.0.20 mit `testIntegration`; Jackson 2.12.7.2 lädt mit Java 11. Prüfschritt: jeder Punkt im PR mit
    „bestätigt“, „Ausweg“ oder „Bitte bestätigen“; danach
    `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` ohne Befund.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew build` | grün, Gerüst-Tests grün (Testdaten), alle Prüffälle „noch nicht gebaut“ |
| `./gradlew :modules:bh-domain:test` | kein roter Fall; Zählung „noch nicht gebaut“ und „abweichend, begründet“ getrennt |
| `./gradlew deploy` und Gogo-Shell `lb de.berichtsheft` | alle Bundles `ACTIVE` |
| `curl -s localhost:9200` | eingebetteter Knoten mit festem Clusternamen |
| `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8080/o/bh-pruefung/zustand` | 200 bei `bh.betrieb=test`, 404 bei `produktion` |
| `./gradlew :modules:bh-test-integration:testIntegration` | Zeitzonen-Test grün, Daten-Fälle „noch nicht gebaut“ |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --list` | Ablauf-Fälle werden gefunden |
| `./gradlew formatSource` | keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit mit deutscher Beschreibung, z. B. „L72-P00: Grundgerüst (Workspace, Bundle, Prüf-Adapter, Messung)“. Vor dem Push
  `./gradlew build` und die Prüf-Adapter lokal grün; `bundles/` und `gradle-local.properties` nie committen.
- Draft-PR mit: Messwerte (Schritt 15), Vorschlag CI-Job L72 (Schritt 16), abgearbeitete Liste „In P00 zu bestätigen“
  (Schritt 17), Stand der Bau-Liste (leer), Gegenproben (Schritt 13) und „Bitte bestätigen“. Hinweis, dass Firefox, Edge und
  der vollständige Lauf nur in CI geprüft werden. Änderungsklasse L72; geschützte Pfade nach gemeinsam 5 (`bh-clock`,
  `bh-pruefung`, `configs/`, `**/upgrade/**`, Build-Dateien), Chris mergt.
- Bericht an die Steuerung per `send_message`: Stand, Befehle und Ergebnisse, Messwerte, offene Punkte. Den Eintrag in
  `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Gradle lädt von `repository.liferay.com` und scheitert (Proxy 403) | Workspace-Plugin-Version und Target Platform prüfen; nur Maven Central; fehlt ein Artefakt, anhalten und melden |
| `initBundle` lädt vom Liferay-CDN | `liferay.workspace.bundle.url` in `gradle-local.properties` auf das lokale Archiv (`file://…`) |
| Portal startet nicht, „SCRAM authentication is not supported“ | alten JDBC-Treiber aus `lib/ext` entfernen, 42.7.14 einsetzen (gemeinsam 4.5) |
| Portal startet mit Java 21 und bricht ab | `JAVA_HOME` auf JDK 11, `JAVA_TOOL_OPTIONS` leer |
| Zeiten um eine oder zwei Stunden verschoben | `-Duser.timezone=GMT` fehlt; JVM und JDBC-Sitzung müssen in UTC laufen (gemeinsam 2.2) |
| Bundle bleibt `INSTALLED` | ungelöster Import: Nicht-OSGi-Bibliothek per `compileInclude` einbetten; `diag <id>` in der Gogo-Shell |
| Speicher reicht nicht, Elasticsearch stirbt | Heap aus der Messung setzen; Firefox und Edge in CI trennen; sonst entfernter Knoten (Profil, Abschnitt 7) |
| Testschnittstelle antwortet in Produktion | Komponente ohne `ConfigurationPolicy.REQUIRE` oder `bh.betrieb` nicht ausgewertet; Gegenprobe Schritt 13 |
| Prüf-Adapter zeigt „0 Tests“ | `bh.pruefung.dir` relativ zum Modul falsch gesetzt (`../../../specs/pruefung`) |
| Jackson landet im Bundle | nur `testImplementation`, nie `compileInclude` (gemeinsam 7) |
