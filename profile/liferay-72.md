# Profil Liferay 7.2

Stand: 15.10.2026 (Etappe G4, Paket F) · Status: **Entwurf zur Freigabe** · @Chris

Dieses Profil ist die Grundlage der Reihe `playbooks/liferay-72/` (P00 bis P10). Es baut auf
`profile/liferay-gemeinsam.md` auf und wiederholt nichts daraus: Schema der App-Tabellen mit Präfix `BH_`, Zeitpunkte als
`TIMESTAMP` in UTC, Versionsspalte und bedingtes Update, Trigger plus `ModelListener`, ein Mandant, Uhr-Schnittstelle,
Prüf-Adapter-Schnittstelle, Bezugsquellen und Bibliotheken stehen dort. Hier steht nur, was auf Liferay Portal 7.2 CE
anders oder zusätzlich zu beachten ist. Verweise in der Form „gemeinsam 2.4“ meinen den Abschnitt in
`profile/liferay-gemeinsam.md`.

Wie jedes Profil ändert diese Datei keine Regel; maßgeblich sind die Fach-Specs unter `specs/`. **Alle Angaben zu
Liferay-Verhalten, Versionen und Werkzeugen gelten als „in P00 zu bestätigen“**, bis P00 sie im laufenden System
nachgewiesen hat; die Liste steht am Ende („In P00 zu bestätigen“). Dieses Profil setzt nichts fest, was
`profile/liferay-gemeinsam.md` regelt oder was beide Plattformen betrifft: Solche Punkte gehören nach dessen Abschnitt 1
in die gemeinsame Datei und stehen hier nur als „Vorschlag für liferay-gemeinsam.md (beide Plattformen)“ unter „Bitte
bestätigen“. Bis zur Freigabe gilt gemeinsam.

## 1. Laufzeit und Versionen

| Baustein | Festlegung für 7.2 | Quelle bzw. Stand |
| --- | --- | --- |
| Portal | Liferay Portal 7.2.1 CE GA2, Tomcat-Bundle (`liferay-ce-portal-tomcat-7.2.1-ga2-…tar.gz`) | letzte GA von 7.2, Bezug SourceForge (gemeinsam 4.1) |
| Sprache | Java 11 (OpenJDK 11 aus dem Ubuntu-Archiv in der Sitzung, `eclipse-temurin:11-jdk` bzw. das Liferay-Image in CI); Quellstand der Fachlogik Java 8 (gemeinsam 3.2), alles Übrige Java 11 ohne Sprachmittel über 11 | gemeinsam 4.2; Java 21 der Sitzung passt nicht |
| Server | Tomcat 9.0.x aus dem Bundle; kein eigener Tomcat | Release-Hinweise 7.2 CE GA2 |
| Modulsystem | OSGi (Apache Felix im Portal); jedes Modul ist ein Bundle mit `bnd.bnd`, Dienste als Declarative-Services-Komponenten (`@Component`) | |
| Build | Liferay Workspace (Gradle) mit `liferay.workspace.product=portal-7.2-ga2` und Target Platform 7.2.1 (Versionen aus `release.portal.bom` 7.2.1, Maven Central); Gradle über den Wrapper des Workspace | Version des Workspace-Plugins, die 7.2 noch kann: P00 |
| Theme-Werkzeug | Theme als Workspace-Projekt unter `themes/` mit dem Node-Werkzeug von Liferay für 7.2 (Gulp, `liferay-theme-tasks`); Node aus der Sitzung, kein Download durch Gradle | Version von `liferay-theme-tasks` und Node: P00 |
| Datenbank | PostgreSQL; in der Sitzung 16.15 (vorinstalliert), in CI derselbe Hauptstand; JDBC-Treiber 42.7.14 ersetzt den Treiber des Bundles | 7.2 ist mit PostgreSQL 10 getestet (gemeinsam 4.5); Risiko in Abschnitt 7 |
| Suchdienst | **eingebetteter Elasticsearch-Knoten** im Liferay-Prozess (Betriebsart `EMBEDDED` des Konnektors `elasticsearch6`), in Sitzung und CI; kein eigener Dienst | gemeinsam 4.4; Einzelheiten unten |
| Browser für Ablauf-Fälle | Playwright für Node in der Version des Repositorys; Chromium und 375 px in der Sitzung, Firefox und Edge nur in CI | gemeinsam 7 |

**Suchdienst im Einzelnen (Bezug gemeinsam 4.4):**

- **Betriebsart:** 7.2 bringt den Konnektor `com.liferay.portal.search.elasticsearch6.impl` mit (Version 3.0.39 laut
  `release.portal.bom` 7.2.1). Ohne Konfiguration startet er einen eingebetteten Knoten im Liferay-Prozess (Port 9200,
  Daten unter `data/elasticsearch6`). Liferay erlaubt das nur für Entwicklung und Tests; für L72 genügt das, weil die App
  den Suchdienst nicht braucht (Personen, Berichte und Prüfliste lesen über Service Builder aus PostgreSQL, nie aus dem
  Index). Eine **Sidecar**-Betriebsart (eigener Elasticsearch-Prozess, von Liferay gestartet) gibt es nach heutigem
  Kenntnisstand erst ab 7.3; auf 7.2 ist die Alternative nur ein entfernter Knoten (`REMOTE`, Docker Hub
  `elasticsearch:6.8.23`, nur in CI). P00 bestätigt beides.
- **Konfiguration:** `liferay-72/configs/common/osgi/configs/com.liferay.portal.search.elasticsearch6.configuration.ElasticsearchConfiguration.config`
  mit `operationMode="EMBEDDED"` und festem `clusterName`; kein Neuaufbau des Index beim Start
  (`index.on.startup=false` in `portal-ext.properties`).
- **Speicher:** Der eingebettete Knoten teilt sich den Heap der Liferay-JVM. Vorschlag: höchstens `-Xmx3g` für die JVM
  (die Voreinstellung in `setenv.sh` des Bundles 7.2.1 liegt laut Review bei `-Xmx2560m`; in P00 zu bestätigen, ebenso
  ob der eingebettete Knoten damit auskommt). Auf dem Standard-Runner (16 GB) bleiben damit
  Reserven für PostgreSQL, Node und drei Browser; P00 misst Spitzenwert und Startzeit und legt die Zahlen fest.
- **Grenze:** Verwaltungsseiten von Liferay (Benutzerliste im Control Panel) lesen aus dem Index. Sie sind nicht Teil der
  App (Abschnitt 6); ein leerer oder veralteter Index berührt keine AK.

## 2. Projektstruktur und Build

Alles für 7.2 liegt unter `liferay-72/`, einem Liferay Workspace. Paketwurzel der Java-Quellen ist in diesem Profil
`de.berichtsheft`; das ist ein Vorschlag für liferay-gemeinsam.md (beide Plattformen, wegen U02), siehe „Bitte
bestätigen“. Code-Bezeichner englisch, Oberfläche deutsch.

```text
liferay-72/
  build.gradle, settings.gradle, gradle.properties   Workspace, Target Platform 7.2.1, Bundle-URL (SourceForge)
  configs/
    common/        portal-ext.properties, osgi/configs/*.config (für alle Umgebungen)
    local/         Sitzung: JDBC auf localhost, bh.betrieb=test, SMTP-Mock
    ci/            GitHub Actions: JDBC auf den Dienst-Container, bh.betrieb=test, Mailpit
    prod/          Vorlage ohne Geheimnisse, bh.betrieb=produktion (nur Demo, kein Produktivbetrieb)
  modules/
    bh-domain/                 reine Fachlogik (Java 8, keine Liferay-Abhängigkeit) mit der Uhr-Schnittstelle,
                               JUnit-Tests samt Fachlogik-Adapter für specs/pruefung (Abschnitt 4)
    bh-clock/                  Umsetzung der Uhr als OSGi-Service (Abschnitt 3.2)
    bh/bh-api, bh/bh-service   Service Builder: service.xml, Modelle, *LocalServiceImpl, Finder, ModelListener,
                               Upgrade-Schritte mit dem Skript „Schutz in der Datenhaltung“ (gemeinsam 2.6)
    bh-access/                 Zugang: LifecycleActions (login.events.post, servlet.service.events.pre,
                               logout.events.post), Sitzungsdauer, Rechteprüfung
    bh-web/                    MVC-Portlets je Bereich, MVC-Commands, JSPs, Template-Kontext für das Theme
    bh-notification/           Kanäle E-Mail, Teams (Demo), App; UserNotificationHandler; Scheduler-Einträge
    bh-pdf/                    PDF-Export (PDFBox, Noto Sans eingebettet)
    bh-pruefung/               Testschnittstelle; nur bei bh.betrieb=test aktiv (gemeinsam 3.2)
    bh-test-integration/       Arquillian-Integrationstests im laufenden Portal (Abschnitt 4)
  themes/
    bh-theme/                  eigenes Theme: Tokens als CSS-Variablen, Dunkelmodus, Rahmen und Navigation
  pruefung/                    Ablauf-Adapter für Playwright (Konfiguration, Selektoren, Anmeldung)
```

**Build-Befehle** (aus `liferay-72/`, Gradle-Wrapper des Workspace):

| Zweck | Befehl |
| --- | --- |
| alles bauen | `./gradlew build` |
| Service Builder nach Änderung an `service.xml` | `./gradlew :modules:bh:bh-service:buildService` |
| Module und Theme ins Bundle | `./gradlew deploy` (kopiert nach `bundles/osgi/modules` bzw. `bundles/osgi/war`) |
| Bundle einrichten | `./gradlew initBundle` mit `liferay.workspace.bundle.url` auf das SourceForge-Archiv bzw. eine lokale Kopie (`file://…`), weil das Liferay-CDN gesperrt ist (gemeinsam 4.1) |
| Format und statische Prüfung | `./gradlew formatSource` (Source Formatter von Liferay, Version P00) |

Der Ordner `bundles/` (Bundle, Daten, Logs) liegt in `.gitignore` des Workspace und wird nie committet. Die erzeugte
`tables.sql` liegt in `modules/bh/bh-service/src/main/resources/META-INF/sql/`; P00 vergleicht sie mit gemeinsam 2.3.

**Service Builder auf 7.2:** `service.xml` mit `dependency-injector="ds"` (Declarative Services statt Spring),
`namespace` `BH` (gemeinsam 2.1), `mvcc-enabled="false"` an jeder Entity (gemeinsam 2.4) und **`remote-service="false"`**
an jeder Entity: Es entstehen keine Remote-Services und keine JSON-Webdienste unter `/api/jsonws`, die an den
Portlets vorbei aufrufbar wären. Ob 7.2 bei `dependency-injector="ds"` alle benötigten Merkmale (Custom-SQL-Finder,
`@Transactional`) wie bei Spring anbietet, klärt P00; sonst Spring-Variante ohne Folgen für Schema und Logik.

**Bestätigung der vorläufigen Pfadmuster aus gemeinsam 5 (Spalte 7.2):** Die Struktur oben bestätigt die Annahme
`liferay-72/modules/<modul>/…` und `liferay-72/configs/…`. Einzelne Muster passen nicht oder fehlen; die Tabelle steht
unter „Bitte bestätigen“ (Pfadmuster), G4-L übernimmt sie.

## 3. Abbildung der Bausteine

Grundlage ist gemeinsam 3.1. Die Tabelle nennt nur, wie 7.2 den gemeinsamen Baustein umsetzt.

| Baustein | Umsetzung auf 7.2 | Ort |
| --- | --- | --- |
| Laufzeit | Abschnitt 1 | – |
| Anmeldung | Liferay-eigene Konten (Login-Portlet von Liferay im eigenen Theme); OIDC als Option, Abschnitt 6 | `bh-access` |
| Zugang bei jedem Zugriff (M02-R03, M02-R04) | `LifecycleAction` mit `key=servlet.service.events.pre`: liest `BH_Person` zu `PortalUtil.getUserId(request)`; unbekannt oder deaktiviert → Abmelden und Seite `kein_zugang` (nur für Seiten der Site „Berichtsheft“, nicht für das Control Panel) | `bh-access`, Paket `…access.events` |
| Binden beim ersten Login (M02-R07, M02-R08) | `LifecycleAction` mit `key=login.events.post` (Klasse `BhLoginPostAction`): ruft die Fachlogik `anmeldungZuordnen` und schreibt die Bindung bedingt (gemeinsam 2.5) | `bh-access` |
| Sitzung höchstens 8 Stunden (M02-R05) | Anmeldezeitpunkt aus der Uhr in der HTTP-Sitzung (beim Login gesetzt), die Pre-Action beendet die Sitzung nach 8 Stunden; `session.timeout` bleibt für Untätigkeit | `bh-access` |
| Rollen und Besitz (M02-R13) | Prüfung in jeder Methode der `*LocalServiceImpl` gegen `BH_Person` des handelnden Benutzers; die MVC-Commands übergeben nur die `userId`. Liferay-Rollen „BH Azubi“ und „BH Ausbilder“ steuern nur die Sichtbarkeit von Seiten (gemeinsam 2.5) | `bh-service`, Paket `…service.impl`; `…security.permission` |
| Persistenz | Service Builder mit DS; Custom SQL in `META-INF/custom-sql/default.xml`, Finder in `…service.persistence.impl.*FinderImpl` über den OSGi-Dienst `CustomSQL` | `bh-service` |
| Transaktion und Gleichzeitigkeit | gemeinsam 2.4; die Transaktion ist die der `*LocalServiceImpl`-Methode. Abweisungen, nach denen nichts gespeichert sein darf, sind Unterklassen von `PortalException` mit festem Grund und rollen zurück. Das Scheitern an fehlenden Pflichtangaben beim Einreichen ist **keine Ausnahme**, sondern ein Ergebnis, damit die gespeicherten Tage bleiben (M05-R08; Nachweis unten) | `bh-service` |
| Historie und Schreibschutz | gemeinsam 2.6; `ModelListener` als DS-Komponenten (Nachweis unten) | `bh-service`, Paket `…model.listener` |
| Uhr | eigener OSGi-Service, Abschnitt 3.2 | `bh-clock` |
| Hintergrundjobs | `MessageListener` plus `SchedulerEngineHelper.register(…)` mit `TriggerFactory`; Abschnitt 3.3 | `bh-notification` |
| Benachrichtigung in der App | `UserNotificationHandler` (DS-Komponente mit `javax.portlet.name` des Benachrichtigungs-Portlets) und `UserNotificationEventLocalService`; Quelle bleibt `BH_Notification` (gemeinsam 2.5). Zähler und Vorschau im Kopf: Vorschlag eigene Glocke im Theme, weil UI-AK-03 („99+“, Name mit genauer Zahl, Vorschau ohne Gelesen-Markierung) mit der Liferay-Glocke nicht sicher erfüllbar ist; das weicht von gemeinsam 2.5 und dem Bordmittel-Grundsatz ab und steht unter „Bitte bestätigen“. `readAt` (M08-R16): Abschnitt 3.5 | `bh-notification`, `bh-theme` |
| E-Mail | gemeinsam 3.2 (Mailservice von Liferay, Konfiguration `mail.session.mail.smtp.*` in `portal-ext.properties`). Offen: Der `MailService` versendet asynchron und meldet keinen Fehler je Nachricht zurück (Abschnitt 7); Vorschlag für liferay-gemeinsam.md (beide Plattformen): synchroner Versand über die `javax.mail.Session` des Portals, unter „Bitte bestätigen“ | `bh-notification` |
| Teams | gemeinsam 3.2, Eigenschaft `bh.teams.modus` als OSGi-Konfiguration | `bh-notification` |
| PDF | PDFBox 2.0.37 (gemeinsam 7) per `compileInclude` ins Modul eingebettet; Noto Sans als Ressource des Moduls | `bh-pdf` |
| Oberfläche | MVC-Portlets mit JSP, Clay-Taglibs nur, wo sie Tokens annehmen; eigene Seiten-Vorlage im Theme; Senna (SPA) für die Site abgeschaltet (Abschnitt 7) | `bh-web`, `bh-theme` |
| Dunkelmodus | Theme mit CSS-Variablen, Wahl vom Server vor dem ersten Darstellen, Umschalter auf „Einstellungen“; Abschnitt 3.4 | `bh-theme`, `bh-web` |
| Konfiguration | OSGi-Konfiguration statt `portal-ext.properties` für eigene Werte: `bh.betrieb`, `bh.teams.modus`; Schnittstellen mit `@Meta.OCD` im Paket `…configuration`, Werte als `.config` unter `configs/<umgebung>/osgi/configs/` | `bh-clock`, `bh-notification` |
| Prüf-Adapter | Abschnitt 4 | `bh-domain`, `bh-pruefung`, `bh-test-integration`, `pruefung/` |
| Suchdienst | Abschnitt 1 | `configs/` |

### 3.1 Upgrade-Mechanik innerhalb von 7.2

- Das Skript „Schutz in der Datenhaltung“ (gemeinsam 2.6) läuft als `UpgradeProcess` in einem
  `UpgradeStepRegistrator` des Moduls `bh-service` (Schritt `0.0.0` → `1.0.0`); `bnd.bnd` trägt
  `Liferay-Require-SchemaVersion: 1.0.0`.
- **In P00 zu bestätigen:** ob 7.2 bei einer frischen Installation die Tabellen von Service Builder anlegt, bevor der
  Schritt `0.0.0` → `1.0.0` läuft, und ob es den Schritt dabei überhaupt ausführt. Ausweg, falls nicht: der Schritt
  prüft im Katalog (`pg_trigger`), ob die Trigger fehlen, und führt das unveränderte Skript dann aus; zusätzlich ein
  Start-Test in P00, der die Trigger im Katalog verlangt.
- Spätere Schemaänderungen bekommen je einen eigenen Schritt (`1.0.0` → `1.1.0` …) und eine neue
  `Liferay-Require-SchemaVersion`; das Upgrade von 6.2.5 bleibt im eigenen Modul nach gemeinsam 6.

### 3.2 Uhr als OSGi-Service (M01-R01 bis M01-R04, AK-1201)

- **Schnittstelle** `Clock` (gemeinsam 3.2) liegt in `bh-domain` (Paket `de.berichtsheft.domain.clock`), damit die
  Fachlogik ohne Liferay-Modul übersetzt und getestet wird. `bh-clock` hängt von `bh-domain` ab und setzt sie um.
- **Eine Komponente** `ClockImpl` (`@Component(service = {Clock.class, ClockControl.class},
  configurationPid = "de.berichtsheft.configuration.BetriebConfiguration")`). Sie liefert die Systemzeit, außer eine
  Vorgabe ist gesetzt. `ClockControl` (`setFixed(Instant)`, `reset()`) nutzt nur die Testschnittstelle in
  `bh-pruefung`.
- **Stellbar nur bei `bh.betrieb=test`:** `ClockImpl` liest die Betriebsart in `@Activate` und `@Modified`. Bei
  `produktion` (Voreinstellung in `@Meta.AD(deflt = "produktion")`) wirft `setFixed` eine Ausnahme und eine schon gesetzte
  Vorgabe wird verworfen (M01-R03). `bh-pruefung` registriert seine Dienste zusätzlich nur bei `bh.betrieb=test`.
- **Einziger Lieferant von „jetzt“** nach gemeinsam 2.2 und 3.2. Auf 7.2 richtet P00 dafür eine Prüfung im Build ein,
  die Aufrufe der Systemzeit außerhalb von `ClockImpl` meldet, mit Gegenprobe.
- **Ein Knoten:** Die gestellte Uhr lebt im Speicher eines Knotens; L72 läuft in Sitzung und CI mit einem Knoten.

### 3.3 Zeitplan in Europe/Berlin

Cron-Ausdrücke des Schedulers von 7.2 werden in der Zeitzone der JVM ausgewertet, und die ist UTC (gemeinsam 2.2). Ein
Cron „Montag 9:00“ wäre im Sommer 11:00 Uhr Berliner Zeit. Deshalb: Alle Einträge laufen in einem festen kurzen Takt
(Vorschlag: Ausgangskorb jede Minute, Erinnerung und Anlegen der Wochen alle 15 Minuten), und die Fachlogik entscheidet
mit der Uhr und Europe/Berlin, ob ein Lauf fällig ist (Montag ab 9:00 Uhr, Nachholen bis Dienstag 23:59 Uhr; M08-R17).
`BH_ReminderRun` verhindert den zweiten Lauf (gemeinsam 2.5). Speicherart der Einträge `StorageType.MEMORY_CLUSTERED`;
ein Neustart verliert nichts, weil der nächste Takt nachholt. P00 bestätigt Takt und Speicherart.

### 3.4 Dunkelmodus auf 7.2

**Umsetzung:**

- **Tokens als CSS-Variablen:** Das Theme `bh-theme` definiert alle Tokens aus `docs/05-ui-spezifikation.md`
  („Design-Tokens“, Farben und Statusfarben) als CSS-Variablen unter `:root` (hell) und `[data-theme="dark"]` (dunkel)
  sowie unter `@media (prefers-color-scheme: dark)` für `[data-theme="system"]`. Werte wie in `src/app/globals.css`.
- **Clay/Bootstrap 4:** Clay 2 in 7.2 färbt über Sass-Variablen, die zur Build-Zeit feste Farben werden; Sass-Funktionen
  wie `darken()` scheitern an `var(--…)`. Deshalb bleiben die Clay-Variablen auf hellen Werten, und das Theme überschreibt
  die Farben der genutzten Komponenten (Knöpfe, Felder, Karten, Labels, Alerts, Navigation, Tabellen, Modale) in
  `_custom.scss` mit `var(--…)`. Eigene Komponenten nutzen nur Tokens. Clay-Komponenten außerhalb dieser Liste nutzt die
  App nicht.
- **Wahl vor dem ersten Darstellen (UI-AK-15):** Ein `TemplateContextContributor` (`type=THEME`) in `bh-web` legt
  `bhTheme` in den Template-Kontext: die Wahl an `BH_Person.theme` des angemeldeten Benutzers, ohne Anmeldung das Cookie
  `bh_theme`, sonst `system` (Fachlogik `darstellungErmitteln`). `portal_normal.ftl` setzt
  `<html data-theme="${bhTheme}" …>` und `color-scheme`. Damit steht das Schema ohne Skript fest.
- **Umschalter:** auf der Seite „Einstellungen“ (Portlet in `bh-web`) als Segment-Auswahl System/Hell/Dunkel. Die Wahl
  geht an den Service (Prüfung von Wert, Person und Aktivität auf dem Server, M09-R16), setzt das Cookie und das Attribut
  am `html`-Element sofort.
- **Ausnahmen wie in der UI-Spezifikation:** PDF und Druckansicht bleiben hell.
- **Nicht im Umfang:** die Verwaltung von Liferay (Control Panel, Admin-Theme, Produktmenü); siehe Abschnitt 6.

**Bewertung je UI-AK aus M09 auf 7.2** („gleichwertig“ = mit der Umsetzung oben erfüllbar, die Prüffälle laufen
unverändert; „abweichend, begründet“ steht zusätzlich unter Abschnitt 6):

| UI-AK | Bewertung auf 7.2 | Umsetzung bzw. Begründung |
| --- | --- | --- |
| UI-AK-01 | gleichwertig | Seitenleiste und Schublade im Theme (`portal_normal.ftl`, eigenes Skript), nicht die Navigation von Liferay |
| UI-AK-02 | gleichwertig | Menü im Theme aus der Rolle in `BH_Person`; Seiten der Site bleiben über Liferay-Rollen gesperrt (gemeinsam 2.5) |
| UI-AK-03 | gleichwertig, wenn die eigene Glocke freigegeben wird (sonst in P08 mit der Liferay-Glocke neu zu bewerten) | eigene Glocke im Theme (Zähler aus `BH_Notification`, Fachlogik wie TypeScript); die Liferay-Glocke ist Abbild (3.5) |
| UI-AK-04 | gleichwertig | Portlet Start Azubi; Fortschritt aus der Fachlogik |
| UI-AK-05 | gleichwertig | Leerzustand mit festem Merker |
| UI-AK-06 | gleichwertig | Raster im Theme; Control Menu von Liferay für Azubi und Ausbilder ausgeblendet (keine Verwaltungsrechte) |
| UI-AK-07 | gleichwertig | Fußleiste im Portlet „Woche erfassen“ |
| UI-AK-08 | gleichwertig | Fehlerleiste mit Sprunglinks, Fokus per Skript des Portlets |
| UI-AK-09 | gleichwertig | Einreichen ruft eine Service-Methode, die speichert und einreicht (M05-R08) |
| UI-AK-10 | gleichwertig | ausgewählter Bericht als Render-Parameter in der Adresse; lesbare Adresse über `FriendlyURLMapper` (P07) |
| UI-AK-11 | gleichwertig | nächster Bericht nach `MVCActionCommand` per Weiterleitung |
| UI-AK-12 | gleichwertig | wie UI-AK-10 unter 1024 px |
| UI-AK-13 | gleichwertig | Symbole aus dem Clay-Iconset (Stift, Pfeil, Haken, Kreuz im Kreis, Uhr) plus Text; Farben über Status-Tokens |
| UI-AK-14 | gleichwertig | Spalte `theme` (gemeinsam 2.3), Prüfung im Service, Cookie für den Zustand ohne Anmeldung |
| UI-AK-15 | gleichwertig | `TemplateContextContributor` und `data-theme` vor dem ersten Darstellen; Risiko Senna (Abschnitt 7) |
| UI-AK-16 | gleichwertig für alle Seiten der App, hell und dunkel; **abweichend, begründet** für die Verwaltung von Liferay | axe über alle Seiten der Site „Berichtsheft“ einschließlich der Anmeldeseite; Control Panel und Admin-Theme sind kein Teil der App (Abschnitt 6) |
| UI-AK-17 | gleichwertig | `scroll-padding` für feste Leisten des Themes; ob das Control Menu bei Admins den Fokus verdeckt, prüft P09 |
| UI-AK-18 | gleichwertig | eigener Dialog auf Basis von `<dialog>` statt `Liferay.Util.openModal` (iFrame, Fokus nicht sicher) |
| UI-AK-19 | gleichwertig | `<title>` im Theme als „<Seite> – Berichtsheft“ (Halbgeviertstrich), Portlet-Dekorator `barebone` ohne eigene Überschrift, genau eine `h1` |
| UI-AK-20 | gleichwertig | eigene Platzhalter; der Ladekreis von Liferay bei Seitenwechseln entfällt mit abgeschaltetem Senna |

### 3.5 Glocke und Gelesen-Status (M08-R16)

- **Quelle** ist `BH_Notification` (gemeinsam 2.5); zu jeder App-Nachricht legt `bh-notification` einen
  `UserNotificationEvent` an und merkt dessen ID in `userNotificationEventId`.
- **Lesen in der App** (eigene Glocke bzw. Seite „Benachrichtigungen“) setzt `readAt` aus der Uhr und markiert den
  zugehörigen `UserNotificationEvent` als gelesen (`archived`), in derselben Transaktion.
- **Lesen über die Liferay-Glocke:** Ein `ModelListener<UserNotificationEvent>` in `bh-notification` setzt bei
  `onAfterUpdate`, wenn `archived` gesetzt und `readAt` der Nachricht mit dieser `userNotificationEventId` noch leer
  ist, `readAt` aus der Uhr. Den Vorzustand braucht das nicht (`onAfterUpdate` bekommt ihn in 7.2 vermutlich nicht;
  alternativ den alten Stand in `onBeforeUpdate` lesen; in P00 zu bestätigen). Ob 7.2 das Gelesen-Markieren über die
  Persistenz schreibt (sonst greift der Listener nicht), klärt P00; Ausweg ist ein eigener `UserNotificationHandler`,
  dessen Link über die App führt und dort `readAt` setzt.
- **Vorschau ohne Gelesen-Markierung** (M09-R03, AK-1015) gilt nur für die eigene Glocke; die Liferay-Liste markiert
  beim Öffnen womöglich selbst (P00).

## 4. Tests und Prüf-Adapter

Gemeinsame Schnittstelle: gemeinsam 3.2 und `specs/pruefung/format.md` („Regeln für Adapter“, „Abweichend,
begründet“). Hier nur Ort, Werkzeug und Befehle für 7.2. Alle Befehle aus `liferay-72/`.

| Ebene | Werkzeug | Ort | Befehl |
| --- | --- | --- | --- |
| `fachlogik` | JUnit 4.13.2, parametrisiert (ein Testfall je Prüffall-ID) | `modules/bh-domain/src/test/java/de/berichtsheft/pruefung/FachlogikPrueffaelleTest.java` | `./gradlew :modules:bh-domain:test` (alle), `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M05` (ein Modul) |
| `daten` | JUnit 4 außerhalb von OSGi gegen die Testschnittstelle der laufenden App (HTTP) | `modules/bh-test-integration/src/testIntegration/java/de/berichtsheft/pruefung/DatenPrueffaelleTest.java` | `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M05` |
| plattformeigene Integrationstests (AK-505, AK-508, AK-803, Zeitzone) | Liferay-Arquillian (gemeinsam 7) im laufenden Portal | `modules/bh-test-integration/src/testIntegration/java/de/berichtsheft/…` | `./gradlew :modules:bh-test-integration:testIntegration` |
| `ablauf` | Playwright für Node, Ablauf-Runner der TypeScript-App mit Selektoren für 7.2 | `pruefung/` (Konfiguration `pruefung/playwright.config.ts`) | `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium` (aus der Wurzel des Repositorys) |

**Fachlogik-Adapter:** liest `specs/pruefung/*.json` (Pfad als Systemeigenschaft `bh.pruefung.dir`, im `test`-Task von
`build.gradle` auf `../../../specs/pruefung` gesetzt), filtert `ebene = fachlogik`, ruft je `schnittstelle` die
Java-Fachlogik und vergleicht das Ergebnis als Ganzes. Eine unbekannte Schnittstelle oder ein Fall ohne Runner lässt den
Lauf scheitern. Der Name jedes Testfalls ist die Prüffall-ID (z. B. `AK-508-06`). Ein Fall mit
`"abweichend": { "liferay-72": … }` wird nicht ausgeführt, sondern als eigener Testfall „abweichend, begründet“ gemeldet
(Assumption mit Verweis, getrennt gezählt, nie grün). Zum Lesen von JSON braucht der Test eine Bibliothek, die
gemeinsam 7 noch nicht nennt (Vorschlag unter „Bitte bestätigen“).

**Testschnittstelle (`bh-pruefung`):** JAX-RS-Anwendung unter `/o/bh-pruefung/…` (Gegenstück zu
`src/app/api/test/zustand/route.ts`) mit Uhr stellen, Bestand leeren, Testdaten laden (Personen, Bundesland, Liferay-Konten
mit Platzhalter-Passwörtern für die Testpersonen) und den Daten-Aktionen aus `specs/pruefung/format.md`. Sie ist nur
registriert, wenn `bh.betrieb=test` (Komponente mit Pflicht-Konfiguration, `ConfigurationPolicy.REQUIRE`), und gibt
sonst 404. Gegenprobe in P00: mit `bh.betrieb=produktion` antwortet sie nicht.

**Ablauf-Adapter:** übernimmt `e2e/pruefung/ablauf-pruefungen.ts` (allgemeine Prüfungen: Fokus, Ansicht, Farbschema,
axe) unverändert und die Logik von `e2e/pruefung/ablauf-adapter.ts`; die Portlets tragen dieselben festen Merker
(`data-status`, `data-woche`, `data-feld`, `data-fehler` …). Die Aktion `anmelden` füllt das Login-Portlet von
Liferay mit den Platzhalter-Zugangsdaten der Testperson; das ist der Anmeldeweg der App auf 7.2, kein Test-Login.
Ob der TypeScript-Adapter dafür in einen gemeinsamen, plattformneutralen Teil geteilt wird, entscheidet P00 (Änderung
außerhalb von `liferay-72/`, eigener Auftrag).

**Testnamen:** Java erlaubt keinen Bindestrich im Methodennamen. Plattformeigene Tests beginnen deshalb mit der AK-ID
ohne Bindestrich und Unterstrich (`AK505_…`, `AK508_…`); parametrisierte Prüffall-Tests tragen die ID unverändert im
Namen (`AK-505-01`). Berichte und PR-Beschreibungen nennen die AK-ID mit Bindestrich.

**Zeitzone:** Ein Integrationstest „Zeitpunkte unabhängig von der Server-Zeitzone“ startet die Prüfung gegen ein
Portal mit `TZ=Europe/Berlin` und `-Duser.timezone=GMT` und liest einen gespeicherten Zeitpunkt in UTC zurück
(Gegenstück zu `tests/db/timezone.test.ts`, gemeinsam 2.2).

**Gegenprobe (Pflicht in P00 und in jedem Paket, das eine Prüfung baut):** je Ebene einmal ein absichtlich falsches
Ergebnis (z. B. vertauschter Fehlercode in der Fachlogik, gelöschter Trigger, fehlender Merker) und den roten Lauf zeigen,
dann zurücknehmen.

## 5. Lokaler Start, Cloud-Sitzung und CI

**Cloud-Sitzung (nativ, ohne Container; Einrichtung in P00, danach im Startskript):**

1. JDK: `apt-get install -y openjdk-11-jdk-headless` (Ubuntu-Archiv, gemeinsam 4.2), `JAVA_HOME` auf das JDK 11.
2. Bundle: Archiv von SourceForge einmal nach `/opt/liferay-72-bundle/` laden (653 MB; nicht ins Repository) und
   `liferay.workspace.bundle.url` in `liferay-72/gradle-local.properties` (nicht committet) auf `file:///opt/…` setzen;
   dann `./gradlew initBundle`.
3. JDBC-Treiber 42.7.14 nach `bundles/tomcat-9.0.x/lib/ext/` (alten Treiber des Bundles entfernen).
4. Datenbank: eigene Datenbank `berichtsheft_l72` (Rolle `berichtsheft` aus dem Startskript), nicht die der TypeScript-App.
5. `configs/local/` wird von `initBundle` ins Bundle kopiert (`portal-ext.properties`, OSGi-Konfiguration mit
   `bh.betrieb=test`, SMTP-Mock).
6. Start: `JAVA_TOOL_OPTIONS= TZ=Europe/Berlin bundles/tomcat-9.0.x/bin/catalina.sh run` im Hintergrund mit Protokoll
   (`JAVA_TOOL_OPTIONS` leer wie beim Keycloak-Start in `CLAUDE.md`); bereit, wenn das Log
   „Server startup in“ meldet. Danach `./gradlew deploy` und warten, bis die Bundles aktiv sind (Gogo-Shell oder Log
   „STARTED de.berichtsheft…“).
7. Node für Theme und Playwright aus der Sitzung; der Workspace lädt kein eigenes Node (`node.download=false`, P00).

Der vollständige Lauf (Bundle-Start, Deploy, Prüf-Adapter aller Ebenen) dauert geschätzt 10 bis 20 Minuten; P00 misst.
Firefox und Edge gibt es in der Sitzung nicht (`CLAUDE.md`).

**Lokal bei einem Entwickler:** wie oben, oder `docker compose` mit dem Image `liferay/portal:7.2.1-ga2` und
PostgreSQL; die Compose-Datei entsteht in P00 unter `liferay-72/`, nicht in der Wurzel.

**CI (GitHub Actions, `docs/ci-richtlinie.md`):** eigener Job „Liferay 7.2“, nur bei Änderungen unter `liferay-72/` und
erst, wenn der PR auf „bereit“ steht. Ablauf: JDK 11 und Node einrichten, Bundle aus dem Actions-Cache (Schlüssel: URL
und Prüfsumme des Archivs), PostgreSQL als Dienst-Container, `./gradlew build deploy`, Portal starten, alle
Prüf-Adapter, Playwright mit Chromium, Firefox, Edge und 375 px. Keine Geheimnisse: Platzhalter-Passwörter der
Testpersonen stehen nur in `configs/ci/` und der Testschnittstelle. Logs und Screenshots als Artefakt (nur Testdaten).
Zeitlimit des Jobs 60 Minuten; Speicher und Laufzeit aus P00.

## 6. Bewusste Abweichungen

### 6.1 Anmeldung mit Liferay-eigenen Konten (Standard)

Bereits entschieden (`docs/06-spec-architektur.md`, „Bewusste Abweichung“). Die Testpersonen melden sich mit E-Mail und
Passwort ihres Liferay-Kontos an; Liferay speichert das Passwort, die App nicht (gemeinsam 2.5). Betroffen ist M02-R02
(„ausschließlich über das Firmenkonto“) und die Ablauf-Fälle, die die Anmeldeseite lesen.

| AK-ID | Prüffälle | Bewertung auf 7.2 | Begründung bzw. Ersatz |
| --- | --- | --- | --- |
| AK-101 | AK-101-01 | **abweichend, begründet** | Die Anmeldeseite ist das Login-Portlet von Liferay mit Passwortfeld; `passwortfeld` ist `true`, `anmeldewege` nennt das Liferay-Konto statt `firmenkonto`. Der Fall trägt `"abweichend": { "liferay-72": "profile/liferay-72.md, Abschnitt 6.1" }` (Änderung der Prüffälle nur nach Freigabe). Mit OIDC (6.2) entfällt die Abweichung, wenn die Bedingungen dort erfüllt sind. |
| AK-101 | AK-101-02, AK-101-03 | gleichwertig | Sie lesen nur die Startseite nach der Anmeldung; dort gibt es kein Passwortfeld. Angemeldet wird über das Login-Portlet (Abschnitt 4). |
| AK-106 | AK-106-01 | **abweichend, begründet** | Die ersten vier Schritte (Abmelden, Startseite und Prüfliste führen zur Anmeldung) sind gleichwertig; der letzte Schritt liest die Anmeldeseite und scheitert wie AK-101 nur an `passwortfeld` und `anmeldewege`. |
| AK-106 | AK-106-02 | gleichwertig | Abmelden über `/c/portal/logout` beendet die Liferay-Sitzung; Liferay ist hier zugleich der Anmeldedienst (M02-R05). |
| AK-102 | AK-102-01 bis AK-102-09 | gleichwertig | Fachlogik unverändert; die Pre-Action prüft bei jedem Zugriff (Abschnitt 3). Konto-ID ist die `userId` des Liferay-Kontos. |
| AK-201 | AK-201-01 bis AK-201-11 | gleichwertig, mit Ersatz | Konto-ID = `userId`; „bestätigte E-Mail“ = `User.isEmailAddressVerified()`. Ob Liferay das Merkmal setzt, wenn die Person ihr Passwort über den Link aus der E-Mail setzt, klärt P00; sonst bleibt ein Liferay-Konto ungebunden (M02-R08 `keine`), und der Weg der Kontoanlage wird angepasst (gemeinsam 2.5, „Bitte bestätigen“). |

Folgen, die keine AK verletzen: Die Testschnittstelle legt die Liferay-Konten der Testpersonen mit Platzhalter-Passwörtern
an (nur bei `bh.betrieb=test`, M02 Abschnitt 8 „Test-Zugang im Produktivbetrieb immer aus“). Ein Liferay-Administrator
ohne `BH_Person` erreicht das Control Panel, aber keine Seite der App (`konto_unbekannt`).

### 6.2 OIDC (OpenID Connect) als Option

7.2 liefert das Modul `com.liferay.portal.security.sso.openid.connect.impl` (gemeinsam 3.1). Die Option ersetzt die
Abweichung zu AK-101 nur, wenn P00 alle Bedingungen nachweist; sonst bleibt 6.1 der einzige Weg.

1. **Verfügbar in CE:** Das Modul ist im Bundle 7.2.1 CE aktiv und über `configs/<umgebung>/osgi/configs/`
   konfigurierbar (Anbieter Keycloak der Demo, Realm aus `keycloak/realm-berichtsheft.json`).
2. **Stabile Konto-ID (M02-R07, AK-201):** Liferay ordnet das OIDC-Konto über eine stabile Kennung (`sub`) zu, nicht
   nur über die E-Mail. Ordnet 7.2 nur über die E-Mail zu, bricht eine geänderte E-Mail beim Anbieter die Bindung
   (AK-201-08); dann ist die Option für AK-201 **abweichend, begründet**.
3. **Bestätigte E-Mail (M02-R08):** Der Claim `email_verified` erreicht die Fachlogik `anmeldungZuordnen`; sonst
   bindet die App nicht.
4. **Nur ein Anmeldeweg (AK-101):** Die Anmeldeseite zeigt nur den OIDC-Anbieter, kein Passwortfeld (eigene
   Anmeldeseite im Theme oder Weiterleitung). Ein Passwort-Login für Liferay-Administratoren bleibt nur außerhalb der
   Site „Berichtsheft“.
5. **Abmelden beim Anmeldedienst (M02-R05, AK-106):** Abmelden beendet auch die Sitzung beim Anbieter (Weiterleitung
   an dessen Abmelde-Endpunkt in `logout.events.post`), falls 7.2 das nicht selbst tut.
6. **Ablauf-Runner:** meldet sich wie die TypeScript-App im Modus Keycloak an; Keycloak läuft in der Sitzung nativ
   (`CLAUDE.md`, „Echter OIDC-Login“).

### 6.3 Oberfläche und Dunkelmodus

- **UI-AK-16, Verwaltung von Liferay — abweichend, begründet:** Control Panel, Produktmenü und Admin-Theme von
  Liferay folgen nicht den Tokens und werden nicht mit axe geprüft. Sie sind kein Teil der App: Azubis und Ausbilder
  erledigen alles auf Seiten der Site „Berichtsheft“ (auch die Nutzerverwaltung, M02 Abschnitt 8), die Verwaltung nutzt
  nur der Betreiber. Alle Seiten der App einschließlich Anmeldung bleiben im Umfang von UI-AK-16.
- Alle übrigen UI-AK von M09 sind auf 7.2 gleichwertig (Tabelle in 3.4); UI-AK-03 nur mit der eigenen Glocke, die
  unter „Bitte bestätigen“ steht.

## 7. Fallstricke und Grenzen

- **Kein Herstellersupport:** 7.2 CE bekommt keine Sicherheitsupdates; nur Demo und Übung (gemeinsam 8).
- **Elasticsearch und Speicher:** Der eingebettete Knoten erhöht Heap-Bedarf und Startzeit; auf dem Standard-Runner
  (4 Kerne, 16 GB, 14 GB SSD) laufen zusätzlich PostgreSQL, Node und Browser. Das 653-MB-Archiv entpackt auf über 1 GB,
  dazu `data/elasticsearch6` und Logs. P00 misst; reicht es nicht: Heap senken, Firefox und Edge in getrennten Jobs,
  sonst entfernter Knoten als Dienst-Container.
- **Liferay-Quellen gesperrt:** Liferay-CDN und Liferay-Nexus sind über den Proxy der Sitzung nicht erreichbar
  (gemeinsam 4.6). Bundle von SourceForge, Abhängigkeiten über die Target Platform aus Maven Central; fehlt ein
  Artefakt dort, hält P00 an und meldet es.
- **PostgreSQL 16 statt 10:** Liferay 7.2 ist mit PostgreSQL 10 getestet; neuer JDBC-Treiber nötig (SCRAM). Startet 7.2
  auf 16 nicht, weicht CI auf eine ältere PostgreSQL-Version aus (gemeinsam 4.5).
- **Senna (SPA-Navigation):** 7.2 wechselt Seiten standardmäßig per JavaScript. Dabei würde `data-theme` am `html` nicht
  neu gesetzt, die Warnung bei ungespeicherten Änderungen (M04-R13) und Seitentitel könnten verloren gehen. Senna wird
  für die Site „Berichtsheft“ abgeschaltet (Theme-Einstellung bzw. Konfiguration `com.liferay.frontend.js.spa`, P00).
- **Service Builder schreibt am Cache vorbei:** gemeinsam 2.4 („Cache“); auf 7.2 zusätzlich das Objekt aus der
  Hibernate-Sitzung entfernen.
- **Remote-Services:** `remote-service="true"` (Voreinstellung) erzeugt JSON-Webdienste, die Rollen- und Besitzprüfung
  der Portlets umgehen könnten. Deshalb überall `false` (Abschnitt 2), Gegenprobe in P02: `/api/jsonws` kennt keine
  BH-Dienste.
- **`ModelListener`:** Grenzen nach gemeinsam 2.6; die Signatur von `onBeforeUpdate` und `onBeforeRemove` in 7.2 ist
  in P00 zu bestätigen.
- **`PortalException` und Rollback:** Jede `PortalException` aus der Methode rollt die ganze Transaktion zurück, auch
  vorher gespeicherte Tage. Eine Abweisung ohne `PortalException` als Oberklasse würde dagegen einen halben
  Statuswechsel festschreiben (M05 Abschnitt 8). Deshalb gilt: Wo nach der Abweisung etwas gespeichert bleiben muss
  (fehlende Pflichtangaben beim Einreichen, M05-R08), liefert der Service ein Ergebnis statt einer Ausnahme; überall
  sonst wirft er. Kein `noRollbackFor`, weil es auch Fehler nach dem Speichern festschreiben würde.
- **Mail asynchron:** Der `MailService` von Liferay versendet über den Message Bus und meldet Fehler nicht zurück; der
  Ausgangskorb braucht das Ergebnis je Nachricht (M08). Vorschlag für liferay-gemeinsam.md unter „Bitte bestätigen“.
- **Scheduler in UTC:** Cron-Zeiten nie als Berliner Zeit schreiben (Abschnitt 3.3).
- **Clay ist Sass, keine CSS-Variablen:** Jede neu genutzte Clay-Komponente braucht eine Token-Überschreibung im Theme,
  sonst bleibt sie im Dunkelmodus hell (axe meldet das nur bei zu wenig Kontrast).
- **OSGi-Abhängigkeiten:** Nicht-OSGi-Bibliotheken per `compileInclude` einbetten; ungelöste Imports zeigt erst das
  laufende Portal (Bundle bleibt `INSTALLED`). Nach jedem Deploy die Bundle-Zustände prüfen.
- **Öffentliches Repository:** In `configs/` nur Platzhalter, keine Geheimnisse; `gradle-local.properties` und
  `bundles/` nie committen.

## Nachweis AK-505 und AK-508

### AK-505: Schreibschutz nach dem Einreichen, auch in der Datenhaltung

**Mittel auf 7.2 (nach gemeinsam 2.6, Trigger plus `ModelListener`):**

1. **Fachlogik und Service:** `darfBearbeiten` (`bh-domain`) entscheidet; jede Methode, die Tage schreibt, sperrt den
   Bericht nach gemeinsam 2.4 und weist mit `ReportNotEditableException extends PortalException` (Grund
   `nicht_bearbeitbar`) ab; ungültige Eingaben ebenso (`tage_ungueltig`), dann rollt alles zurück (AK-505-04).
2. **Einreichen mit Speichern (M05-R08):** `WeeklyReportLocalServiceImpl.submit(…)` speichert die Tage, prüft dann die
   Pflichtangaben und gibt ein `SubmitResult` zurück: entweder eingereicht oder `pflichtangaben_fehlen` mit den Tagen.
   Das Scheitern an den Pflichtangaben **wirft nicht**; die Transaktion endet normal, die Tage bleiben als Entwurf
   gespeichert, Status, Version und Historie bleiben unverändert (AK-505-03). Alle anderen Abweisungen werfen vor dem
   Speichern bzw. rollen zurück.
3. **`ModelListener` als frühe Abweisung:** `ReportDayModelListener extends BaseModelListener<ReportDay>`
   (`@Component(service = ModelListener.class)`) weist in `onBeforeUpdate` und `onBeforeRemove` ab, wenn der Bericht
   eingereicht oder freigegeben ist. Ebenso `StatusChangeModelListener` und `CommentModelListener` für jedes Ändern und
   Löschen (M06-R08); Ausnahme `ModelListenerException` mit Ursache `HistoryImmutableException` (Grund
   `historie_unveraenderlich`).
4. **Trigger als Schutz an der Fachlogik vorbei:** nach gemeinsam 2.6, angelegt durch den Upgrade-Schritt aus 3.1.

**Prüffälle:** AK-505-01, AK-505-02, AK-505-03, AK-505-04 (Ebene `daten`, über die Testschnittstelle) und AK-505-05,
AK-505-06, AK-505-07 (Ebene `fachlogik`, `darfBearbeiten`). Für die Historie zusätzlich AK-803-01 bis AK-803-05.

**JUnit-Tests (plattformeigen, Arquillian, `bh-test-integration`):**

| Test | Playbook | Prüft |
| --- | --- | --- |
| `ReportDayProtectionTest.AK505_datenhaltungWeistAendernEinesEingereichtenTagsAb` | P05 | direkter JDBC-Aufruf `UPDATE BH_ReportDay … ` auf einen eingereichten Bericht scheitert mit SQLState `P0001`; Gegenstück zu `tests/db/status-change.test.ts` |
| `ReportDayProtectionTest.AK505_modelListenerWeistAendernUeberDiePersistenzAb` | P05 | `reportDayLocalService.updateReportDay(…)` auf einen eingereichten Bericht scheitert mit `ModelListenerException`, Daten unverändert |
| `HistoryProtectionTest.AK803_datenhaltungWeistAendernUndLoeschenAb` | P06 | direktes `UPDATE` und `DELETE` auf `BH_StatusChange` und `BH_Comment` scheitern mit SQLState `BH803`; Prüf-Adapter meldet `historie_unveraenderlich` |

**Gegenproben (P05/P06):**

- Trigger `report_day_locked` bzw. `status_change_no_update` in der Testdatenbank entfernen → der Test zur Datenhaltung
  wird rot; Trigger wieder anlegen.
- Komponente `ReportDayModelListener` abschalten (Gogo-Shell `scr:disable` bzw. Komponente vorübergehend ohne
  `@Component`) → `AK505_modelListenerWeistAendernUeberDiePersistenzAb` wird rot (die Abweisung kommt dann erst als
  `P0001` aus dem Trigger, nicht als `ModelListenerException`); danach wieder einschalten.
- `submit` vorübergehend bei fehlenden Pflichtangaben werfen lassen → AK-505-03 wird rot (Tage sind zurückgerollt);
  danach zurücknehmen.

### AK-508: Versionsstand, bedingtes Update, fester Fehlergrund

**Mittel auf 7.2 (nach gemeinsam 2.4):**

1. **Versionsspalte, Sperre und bedingtes Update** nach gemeinsam 2.4 (Schritte 1 bis 4).
2. **Service-Transaktion auf 7.2:** `WeeklyReportLocalServiceImpl.transition(long actorUserId, long weeklyReportId,
   String action, String seenStatus, int seenVersion, String text, Map<String, String> dayComments)` mit der
   Transaktion der Methode (`@Transactional(rollbackFor = {PortalException.class, SystemException.class})`,
   Voreinstellung der `*LocalServiceImpl`). `text` ist Gesamtkommentar bzw. Begründung, `dayComments` die
   Tageskommentare beim Ablehnen (Tag → Text, M05-R22). Die Sperre liefert `WeeklyReportFinderImpl` (Custom SQL), das
   bedingte Update läuft über `SQLQuery.executeUpdate()`, danach `clearCache` des Berichts.
3. **Fehlergrund:** `ReportTransitionException extends PortalException` mit einem Feld `reason` (bei `text_zu_lang`
   zusätzlich `field` und die betroffenen Tage `days`, wie der Prüffall `"tage"` erwartet), gemeldet in der Reihenfolge von M05-R21: `zugriff_verweigert` (Person, Rolle, Besitz);
   `uebergang_unzulaessig` (Status, M05-R02) bzw. die Gründe des gesehenen Stands aus M05-R20
   (`bericht_zurueckgezogen`, `bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`,
   `bereits_zurueckgenommen`, `inzwischen_geaendert`); `azubi_deaktiviert`; `kommentar_fehlt`, `begruendung_fehlt`,
   `text_zu_lang`. Die Gründe liefert `uebergangPruefen` aus `bh-domain`; der Service erfindet keine eigenen. Ergibt das
   bedingte Update trotzdem keine Zeile, meldet er `inzwischen_geaendert` (zweite Sicherung). Die Oberfläche wählt den
   Meldungstext über den Grund, der Prüf-Adapter liefert ihn unverändert als `fehler`.

**Prüffälle:** AK-508-01, AK-508-02, AK-508-03, AK-508-04, AK-508-05 (Ebene `daten`, über die Testschnittstelle) und
AK-508-06, AK-508-07, AK-508-08, AK-508-09, AK-508-10, AK-508-11 (Ebene `fachlogik`, `uebergangPruefen`).

**JUnit-Test (plattformeigen, Arquillian, `bh-test-integration`, P05):**
`ConcurrentTransitionTest.AK508_vonZweiGleichzeitigenAktionenGelingtGenauEine`. Zwei Threads rufen auf demselben
gesehenen Stand gleichzeitig `transition` (Zurückziehen durch Anna, Freigeben durch Bernd), gestartet über einen
`CountDownLatch`; jede in eigener Transaktion. Erwartet: genau ein Erfolg, der andere scheitert mit
`ReportTransitionException` und einem Grund aus M05-R20; `version` ist genau um 1 gestiegen; genau ein neuer Eintrag in
`BH_StatusChange`. Gegenstück zu `tests/db/transitions.test.ts` („AK-508 Zurückziehen und Freigeben gleichzeitig“).

**Gegenprobe (P05):** die Sperre entfernen und das Update ganz ohne Bedingung schreiben (nur
`WHERE weeklyReportId = ?`, weder `status` noch `version`) → beide Threads lesen denselben Stand, beide Prüfungen
gelingen, der Test zeigt zwei Erfolge bzw. zwei Historieneinträge und wird rot; danach zurücknehmen. Bleibt
`AND status = ?` stehen, wertet PostgreSQL die Bedingung nach dem Warten neu aus, und der Test bliebe grün.

## Bitte bestätigen und in P00 zu bestätigen

### Bitte bestätigen

- [ ] Anmeldung mit Liferay-eigenen Konten als Standard; **abweichend, begründet** nur AK-101-01 und AK-106-01
      (AK-101-02 und AK-101-03 gleichwertig). Die beiden Fälle bekommen `"abweichend": { "liferay-72": … }` (Änderung
      unter `specs/pruefung/` in einem eigenen, freigegebenen Paket).
- [ ] OIDC nur als Option unter den sechs Bedingungen aus 6.2; ohne Nachweis in P00 bleibt es aus.
- [ ] **UI-AK-16 abweichend, begründet** für die Verwaltung von Liferay (Control Panel, Admin-Theme); alle Seiten der App
      bleiben im Umfang (6.3). Alle übrigen UI-AK von M09 gleichwertig (3.4), UI-AK-03 unter der Bedingung unten.
- [ ] „Bestätigte E-Mail“ = `User.isEmailAddressVerified()` (6.1, AK-201).
- [ ] **Abweichung von gemeinsam 2.5 (Bordmittel):** eigene Glocke im Theme für UI-AK-03; die Liferay-Glocke bleibt
      Abbild, `readAt` folgt beiden Wegen (3.5). Alternative: nur die Liferay-Glocke, dann UI-AK-03 in P08 neu bewerten.
- [ ] **Vorschlag für liferay-gemeinsam.md (beide Plattformen):** Paketwurzel `de.berichtsheft` (mit G4-E abzustimmen;
      erleichtert U02).
- [ ] Testnamen in Java mit `AK505_…` statt `AK-505 …` (Bindestrich in Methodennamen nicht erlaubt; Abschnitt 4).
- [ ] **Vorschlag für liferay-gemeinsam.md (beide Plattformen), Abschnitt 7:** eine JSON-Bibliothek nur für Tests (Prüf-Adapter liest `specs/pruefung/*.json`),
      Vorschlag Gson (Apache-2.0, Maven Central `com.google.code.gson:gson`, Version in P00), für beide Plattformen.
- [ ] Zeitplan im festen Takt mit Entscheidung in der Fachlogik statt Cron in Berliner Zeit (3.3).
- [ ] **Vorschlag für liferay-gemeinsam.md (beide Plattformen), Abschnitt 3.2:** synchroner Mailversand über die
      Mail-Sitzung des Portals statt des asynchronen `MailService`, damit der Ausgangskorb Erfolg und Fehler je Nachricht
      erfährt (Abschnitt 3, 7). Bis zur Freigabe gilt gemeinsam 3.2.
- [ ] **Pfadmuster für AM-R04 (gemeinsam 5, Spalte 7.2), Übernahme durch G4-L:**

| Muster aus gemeinsam 5 bzw. neu | Stand | Begründung |
| --- | --- | --- |
| `liferay-72/modules/**/login/**` | korrigiert: ersetzt durch `liferay-72/modules/bh-access/**` | 7.2 bindet Login, Zugang je Anfrage, Sitzungsdauer und Abmelden als `LifecycleAction` im Modul `bh-access`; ein Paket `login` gibt es nicht. Das ganze Modul ist sicherheitsrelevant |
| `liferay-72/modules/**/*LoginPostAction*.java` | bestätigt | Klasse `BhLoginPostAction` |
| `liferay-72/modules/**/servlet/filter/**`, `liferay-72/modules/**/*Filter.java` | bestätigt | falls ein Servlet-Filter nötig wird (Sitzungsdauer); Standard ist die Pre-Action |
| `liferay-72/modules/**/domain/access/**` | bestätigt | `bh-domain`, Paket `de.berichtsheft.domain.access` |
| `liferay-72/modules/**/service/impl/**` | bestätigt | Rollen- und Besitzprüfung in `*LocalServiceImpl` |
| `liferay-72/modules/**/security/permission/**` | bestätigt | |
| `liferay-72/modules/**/portlet/**Portlet.java` | korrigiert: `liferay-72/modules/**/portlet/**/*Portlet.java` | gültige Glob-Form; Rechte stehen in den Komponenten-Eigenschaften der Portlet-Klasse |
| `liferay-72/modules/**/resource-actions/**` | bestätigt | `liferay-72/modules/<modul>/src/main/resources/resource-actions/default.xml` |
| `liferay-72/configs/**` | bestätigt | `bh.betrieb`, Anmeldung, OIDC |
| `liferay-72/modules/**/pruefung/**` | korrigiert: `liferay-72/modules/bh-pruefung/**` | ganzes Modul der Testschnittstelle (auch Konfiguration und Registrierung), wie bei `bh-clock`; der Fachlogik-Adapter in `bh-domain` liegt außerhalb |
| `liferay-72/modules/**/service.xml`, `liferay-72/modules/**/sql/**`, `liferay-72/modules/**/model/listener/**` | bestätigt | Schema, erzeugtes SQL, `ModelListener` |
| neu: `liferay-72/modules/**/upgrade/**` | ergänzt | das Skript „Schutz in der Datenhaltung“ läuft als Upgrade-Schritt (3.1); gemeinsam 6 setzt das Muster voraus, Abschnitt 5 nennt es nicht |
| neu: `liferay-72/modules/**/custom-sql/**`, `liferay-72/modules/**/service/persistence/impl/**` | ergänzt | Sperre und bedingtes Update (AK-508) |
| neu: `liferay-72/modules/**/configuration/**` | ergänzt | Voreinstellung `bh.betrieb=produktion` steht in der Konfigurationsschnittstelle (M01-R03) |
| neu: `liferay-72/modules/bh-clock/**` | ergänzt | stellbare Uhr darf in Produktion nie wirken (M01-R03) |
| neu: `liferay-72/pruefung/**` | ergänzt | Ablauf-Adapter mit Anmeldung und Platzhalter-Zugangsdaten |
| neu: `liferay-72/**/build.gradle`, `liferay-72/settings.gradle`, `liferay-72/gradle.properties`, `liferay-72/modules/**/bnd.bnd`, `liferay-72/themes/**/package.json` | ergänzt | externe Bibliotheken (gemeinsam 7) und `Liferay-Require-SchemaVersion` werden hier festgelegt |

### In P00 zu bestätigen

- [ ] Bundle 7.2.1 GA2 startet mit OpenJDK 11 aus dem Ubuntu-Archiv, PostgreSQL 16 und JDBC 42.7.14; Speicher und
      Startzeit in Sitzung und auf dem Standard-Runner gemessen (Abschnitt 1, 7).
- [ ] Version des eingebetteten Elasticsearch, Betriebsart `EMBEDDED` per `.config`, keine Sidecar-Betriebsart in 7.2,
      Heap-Bedarf (Abschnitt 1).
- [ ] Workspace-Plugin- und Gradle-Version für 7.2; Auflösung aller Abhängigkeiten aus Maven Central ohne Liferay-Nexus;
      `initBundle` mit SourceForge- bzw. `file://`-URL (Abschnitt 2).
- [ ] Theme-Werkzeug (`liferay-theme-tasks`, Gulp) und Node-Version, ohne Download durch Gradle (Abschnitt 1, 5).
- [ ] Service Builder mit `dependency-injector="ds"`: Custom SQL, `@Transactional`, `mvcc-enabled="false"`,
      `remote-service="false"`; erzeugte `tables.sql` gegen gemeinsam 2.3 (Abschnitt 2).
- [ ] Reihenfolge Tabellenanlage und Upgrade-Schritt `0.0.0` → `1.0.0` bei frischer Installation (3.1).
- [ ] Signatur von `BaseModelListener.onBeforeUpdate`/`onBeforeRemove` in 7.2 (Nachweis AK-505).
- [ ] `SQLQuery.executeUpdate()` für das bedingte Update und Cache-Leerung danach (Nachweis AK-508).
- [ ] `LifecycleAction` für `login.events.post`, `servlet.service.events.pre`, `logout.events.post` (Abschnitt 3).
- [ ] `User.isEmailAddressVerified()` nach Setzen des Passworts über den Mail-Link (6.1).
- [ ] OIDC-Modul in CE: aktiv, Zuordnung über `sub`, `email_verified`, Abmelden beim Anbieter (6.2).
- [ ] `TemplateContextContributor` vom Typ THEME und `data-theme` vor dem ersten Darstellen; Senna für die Site aus (3.4, 7).
- [ ] Clay-Version in 7.2 und Liste der Komponenten mit Token-Überschreibung (3.4).
- [ ] Scheduler: `SchedulerEngineHelper`/`TriggerFactory`, Speicherart, Takt (3.3).
- [ ] Falls freigegeben: synchroner Mailversand über die Mail-Sitzung des Portals (Abschnitt 3).
- [ ] Gelesen-Markieren über die Liferay-Glocke erreicht den `ModelListener<UserNotificationEvent>` (3.5).
- [ ] PDFBox per `compileInclude` als OSGi-Modul lauffähig (Abschnitt 3).
- [ ] Liferay-Arquillian 1.0.20 mit 7.2 (gemeinsam 7) und Aufgabe `testIntegration` im Workspace (Abschnitt 4).
- [ ] Testschnittstelle als JAX-RS unter `/o/bh-pruefung/` nur bei `bh.betrieb=test` (Abschnitt 4).
- [ ] Zeitzonen-Test mit `TZ=Europe/Berlin` (Abschnitt 4, gemeinsam 2.2).
- [ ] Clay-Iconset enthält die Symbole für UI-AK-13; `<dialog>` in allen CI-Browsern (3.4).
