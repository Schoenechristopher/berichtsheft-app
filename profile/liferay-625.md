# Plattform-Profil Liferay Portal 6.2.5 CE GA6

Stand: 15.10.2026 (Etappe G4, Paket E) · Status: **Entwurf zur Freigabe** · @Chris

Dieses Profil ist die Grundlage der Reihe `playbooks/liferay-625/` (P00–P10). Es baut auf
`profile/liferay-gemeinsam.md` auf und wiederholt nichts daraus: Schema der App-Tabellen mit Präfix `BH_`, Zeitpunkte
als `TIMESTAMP` in UTC, Versionsspalte von Hand, Trigger plus `ModelListener`, genau ein Mandant, Fachlogik auf
Sprachstand Java 8, Uhr-Service, Prüf-Adapter-Schnittstelle, Bezugsquellen und Bibliotheken stehen dort. Hier steht nur,
was für 6.2.5 eigen ist; Unterschiede zu 7.2 nur aus Sicht von 6.2.5.

- Maßgeblich sind die Fach-Specs unter `specs/`; dieses Profil ändert keine Regel. Wo 6.2.5 eine Anforderung nicht 1:1
  erfüllt, steht die Ersatzlösung mit dem Prüffall, der sie zeigt. Was nicht gleichwertig ist, heißt „abweichend,
  begründet“ und steht unter „Bitte bestätigen“.
- **Alles Liferay-Verhalten in diesem Profil gilt als „in P00 zu bestätigen“**, auch wo es nicht eigens dabeisteht.
  Nichts davon ist im laufenden System ausprobiert; die Liste der Punkte steht am Ende („In P00 zu bestätigen“).
- Plattform-Schlüssel für `abweichend` in den Prüffällen (`specs/pruefung/format.md`, „Abweichend, begründet“):
  **`liferay-625`** (Vorschlag, siehe „Bitte bestätigen“).

## 1. Laufzeit und Versionen

| Punkt | 6.2.5 | Stand |
| --- | --- | --- |
| Portal | Liferay Portal 6.2.5 CE GA6, Tomcat-Bundle (Bezugsquelle `liferay-gemeinsam.md` 4.1) | Bundle bestätigt (SourceForge); Inhalt in P00 |
| Server | Tomcat 7 aus dem Bundle (erwartet 7.0.62); Servlet 3.0, JSP 2.2, Portlet 2.0 (JSR-286) | in P00 zu bestätigen |
| Java | OpenJDK 8 (Ubuntu-Paket `openjdk-8-jdk-headless`); Fachlogik auf Sprachstand 8, Ausweichregel Java 7 nach `liferay-gemeinsam.md` 3.2 | in P00 zu bestätigen (Java 8 für 6.2 nur durch Forenbeitrag belegt) |
| Build | Plugins SDK 6.2 GA6 (Ant, Ivy); Ant aus dem Ubuntu-Paket `ant` (1.10, läuft nur auf Java 8 und neuer); `javac.source` und `javac.target` auf `1.8` angehoben (Voreinstellung des SDK ist älter) | in P00 zu bestätigen (Ant-Version, Ivy ohne Liferay-Nexus, Sprachstand) |
| Datenbank | PostgreSQL 16 (Sitzung und CI), JDBC-Treiber 42.7.14 statt des mitgelieferten Treibers in `tomcat-7.0.62/lib/ext/` | in P00 zu bestätigen (Start auf PostgreSQL 16, SCRAM) |
| ORM und Transaktion | Hibernate 3 und Spring 3 aus dem Portal; Service Builder 6.2 | in P00 zu bestätigen |
| Suchdienst | eingebettetes Lucene des Portals (`data/lucene/`); die App indiziert nichts; kein Elasticsearch | in P00 zu bestätigen |
| Oberfläche | AlloyUI 2 mit Bootstrap 2.3, Theme mit Velocity-Vorlagen (`portal_normal.vm`), Sass-Übersetzung des Themes beim Deployment | in P00 zu bestätigen (Sass-Version, siehe 7) |
| Zeitzone | JVM `-Duser.timezone=GMT` aus `setenv.sh` des Bundles (`liferay-gemeinsam.md` 2.2) | in P00 zu bestätigen |

**Unterschiede zu 7.2, aus Sicht von 6.2.5:** kein OSGi, keine Komponenten und keine OSGi-Konfiguration; alles läuft
als klassische Webanwendung (WAR) im Tomcat, Konfiguration über `portal-ext.properties` und Properties-Dateien des
Plugins. Kein Elasticsearch, kein Arquillian, kein Liferay Workspace. Upgrade-Schritte über `UpgradeProcess` statt
`UpgradeStepRegistrator`. Einheitliche Seitenaufrufe ohne SPA-Navigation (SennaJS gibt es erst ab 7.0).

## 2. Projektstruktur und Build

### 2.1 Aufbau

**Ein Plugin für die ganze App.** Portlets, Service Builder, Hook (Login-Aktion, Servlet-Filter), `ModelListener`,
Scheduler, Uhr-Service und Testschnittstelle liegen in **einem** Portlet-Plugin `bh-portlet`. Grund: Auf 6.2 hat jedes
Plugin einen eigenen Klassenlader; eine gestellte Uhr oder ein Cache in einem zweiten Plugin (z. B. einem eigenen Hook)
wäre ein anderer Zustand. Ein Portlet-Plugin darf in 6.2 zusätzlich eine `liferay-hook.xml` tragen (in P00 zu
bestätigen). Daneben nur das Theme.

```text
liferay-625/                                  Wurzel des Plugins SDK 6.2 (build.properties des SDK)
  build.<benutzer>.properties                 nicht eingecheckt; Pfad zum Bundle (app.server.*), aus Vorlage
  build.beispiel.properties                   Vorlage ohne Geheimnisse
  ivy-settings.xml                            nur Maven Central (Liferay-Nexus ist gesperrt, gemeinsam 4.3)
  portlets/bh-portlet/
    build.xml, ivy.xml                        Ant-Ziele, Abhängigkeiten (PDFBox, JDBC, JUnit …)
    docroot/WEB-INF/
      service.xml                             Entities nach gemeinsam 2.3, namespace BH
      portlet.xml, liferay-portlet.xml        Portlets, Scheduler-Einträge, Benachrichtigungs-Handler
      liferay-display.xml, liferay-plugin-package.properties
      liferay-hook.xml                        Login-Aktion, Servlet-Filter, custom-jsp-dir /html/hooks/login
      web.xml                                 Servlet der Testschnittstelle (antwortet 404 außer bei bh.betrieb=test)
      sql/                                    von Service Builder erzeugt (tables.sql, indexes.sql, sequences.sql)
      service/                                von Service Builder erzeugte API (nicht von Hand ändern)
      src/
        portal.properties                     Hook: login.events.post, servlet.service.events.pre
        portlet.properties                    Einstellungen des Portlets; ob upgrade.processes und Release-Nummer hier
                                              oder in service.properties stehen, klärt P00
        service.properties                    von Service Builder erzeugt (nicht von Hand ändern)
        service-ext.properties                value.object.listener.* (ModelListener), build.auto.upgrade=false (7)
        META-INF/portlet-model-hints.xml      Spaltenlängen nach gemeinsam 2.3
        custom-sql/default.xml                SELECT … FOR UPDATE, bedingtes Update, FOR UPDATE SKIP LOCKED
        resource-actions/default.xml          Rechte der Portlets
        de/berichtsheft/
          domain/**                           reine Fachlogik ohne Liferay-Import (Gegenstück zu src/domain/)
          domain/access/**                    Zugang und Sichtbarkeit (Gegenstück zu access.ts, report-access.ts)
          clock/**                            Uhr-Service (gemeinsam 3.2)
          service/impl/**                     *LocalServiceImpl mit Rollen-, Besitz- und Statusprüfung
          service/permission/**               Prüfung gegen BH_Person (nicht gegen Liferay-Rollen)
          service/persistence/*FinderImpl.java
          model/listener/**                   ModelListener der Historie (gemeinsam 2.6)
          hook/events/**                      LoginPostAction (Binden), ServicePreAction (Theme-Daten)
          servlet/filter/**                   Zugang je Anfrage, Sitzung höchstens 8 Stunden
          upgrade/**                          UpgradeProcess mit dem Skript „Schutz in der Datenhaltung“
          scheduler/**                        MessageListener für Ausgangskorb, Erinnerung, Wochen anlegen
          notification/**                     Kanäle E-Mail, Teams, App; UserNotificationHandler
          pdf/**                              PDF mit PDFBox
          portlet/**                          MVCPortlet-Klassen
          pruefung/**                         Testschnittstelle (nur bei bh.betrieb=test)
    docroot/html/**                           JSPs der Portlets
    docroot/html/hooks/login/**               custom-jsp-dir des Hooks: html/portlet/login/** (Anmelden, Passwort
                                              vergessen) und html/portal/update_password.jsp (Passwort setzen)
    test/unit/**                              JUnit ohne Portal (Fachlogik, Prüf-Adapter Fachlogik)
    test/db/**                                JUnit gegen PostgreSQL ohne Portal (Trigger, Sperre)
    test/integration/**                       JUnit gegen das laufende Portal über die Testschnittstelle
  themes/bh-theme/
    docroot/_diffs/css/custom.css             Gestaltung über Tokens (Sass des Portals)
    docroot/_diffs/templates/portal_normal.vm Tokens, data-theme, Rahmen, Menü, Glocke
    docroot/_diffs/templates/portlet.vm       Portlet-Rahmen ohne eigene Überschrift
    docroot/_diffs/js/main.js                 Schublade, Fokus, Fußleiste
  e2e/                                        Playwright-Konfiguration und Ablauf-Adapter für 6.2.5
  config/portal-ext.beispiel.properties       Vorlage; Demo-Werte nur als Platzhalter
  docker/                                     Image für CI (falls das Docker-Hub-Image nicht reicht)
```

Paketwurzel `de.berichtsheft` ist ein Vorschlag für beide Plattformen, also für `liferay-gemeinsam.md` (siehe „Bitte
bestätigen“). Die Fachlogik unter `domain/` wird mit dem Portlet gebaut, darf aber nichts aus `com.liferay.*`
importieren; ein Unit-Test prüft das (Gegenstück zur Regel in `CLAUDE.md`). Ob 6.2.5 und 7.2 dieselben Quelldateien der
Fachlogik nutzen, legt P00 fest (`liferay-gemeinsam.md` 3.2).

### 2.2 Build-Befehle (Plugins SDK, Ant)

Alle Befehle im Ordner `liferay-625/portlets/bh-portlet/` bzw. `liferay-625/themes/bh-theme/`, mit Java 8 im `PATH`.

| Zweck | Befehl | Ergebnis |
| --- | --- | --- |
| Service Builder | `ant build-service` | Modell, Persistenz, `docroot/WEB-INF/service/`, `sql/tables.sql` |
| Übersetzen | `ant compile` | Klassen unter `docroot/WEB-INF/classes/` |
| Paket | `ant war` | `bh-portlet-6.2.0.1.war` (Name in P00 zu bestätigen) unter `liferay-625/dist/` |
| Einspielen | `ant deploy` | WAR nach `<bundle>/deploy/`; fertig, wenn das Tomcat-Log „1 portlet for bh-portlet is available for use“ meldet |
| Theme | `ant deploy` im Theme-Ordner | Theme mit Eltern-Theme `_styled` (nicht `classic`, dessen Farben wären zu überdecken) |
| Tests | Ant-Ziele aus Abschnitt 4 | JUnit-Berichte unter `liferay-625/portlets/bh-portlet/test-results/` |

Die Ant-Ziele `test-unit`, `test-db`, `pruefung-fachlogik`, `pruefung-daten` und `test-integration` legt P00 in der
`build.xml` des Plugins an (mit der Ant-Aufgabe `junit`), falls das SDK sie nicht mitbringt.

### 2.3 Pfadmuster für AM-R04 (Abgleich mit `liferay-gemeinsam.md`, Abschnitt 5)

Abgleich der Spalte 6.2.5 mit der Struktur aus 2.1. „Bestätigt“ heißt: Das Muster trifft die geplanten Dateien.
„Korrigiert“ heißt: ergänzt; die Ergänzungen stehen zusätzlich unter „Bitte bestätigen“ zur Übernahme durch G4-L.

| Entsprechung zu | Vorläufiges Muster 6.2.5 | Ergebnis | Stand nach diesem Profil |
| --- | --- | --- | --- |
| `src/auth.ts`, `src/lib/auth/**` | `liferay-625/**/hook/**`, `liferay-625/**/liferay-hook.xml`, `liferay-625/**/portal.properties` | korrigiert | trifft `de/berichtsheft/hook/events/**`, `liferay-hook.xml` und `docroot/WEB-INF/src/portal.properties` des Plugins; zusätzlich `liferay-625/**/html/hooks/login/**` (JSP-Hook der Anmeldeseite) |
| `src/proxy.ts`, `src/lib/session.ts` | `liferay-625/**/servlet/filter/**`, `liferay-625/**/*Filter.java` | bestätigt | unverändert |
| `src/domain/access.ts`, `src/domain/report-access.ts` | `liferay-625/**/domain/access/**` | bestätigt | unverändert |
| Rollen- und Besitzprüfung in Serveraktionen | `liferay-625/**/service/impl/**`, `liferay-625/**/service/permission/**` | bestätigt | unverändert |
| Rechte der Portlets | `liferay-625/**/portlet.xml`, `liferay-625/**/liferay-portlet.xml`, `liferay-625/**/resource-actions/**` | bestätigt | unverändert |
| Konfiguration, Betriebsart, Testschnittstelle | `liferay-625/**/portal-ext.properties`, `liferay-625/**/pruefung/**` | korrigiert | dazu `liferay-625/**/portal-ext*.properties` (Vorlage heißt `portal-ext.beispiel.properties`) und `liferay-625/**/web.xml` (trägt das Servlet der Testschnittstelle ein) |
| Schema und Schutz in der Datenhaltung | `liferay-625/**/service.xml`, `liferay-625/**/sql/**`, `liferay-625/**/model/listener/**` | korrigiert | dazu `liferay-625/**/upgrade/**` (dort liegt das Skript aus gemeinsam 2.6), `liferay-625/**/custom-sql/**` (Sperre und bedingtes Update, AK-508), `liferay-625/**/portlet.properties` (Upgrade-Prozesse, falls P00 sie dort findet), `liferay-625/**/service*.properties` (`service-ext.properties` meldet die `ModelListener` an und setzt `build.auto.upgrade`), `liferay-625/**/portlet-model-hints.xml` (Spaltenlängen) |

Begründung der Korrekturen: In 6.2.5 meldet nicht eine Annotation, sondern eine Properties-Datei den `ModelListener`
an: Die `*PersistenceImpl` eines Plugins liest `value.object.listener.<Modell>` über `ServiceProps`, also aus
`service.properties` bzw. `service-ext.properties`; ein Eintrag dort abzuschalten hebelt den Schutz aus. Wo
`upgrade.processes` steht, klärt P00; beide Dateien sind deshalb erfasst. `build.auto.upgrade=true` würde
Tabellen bei einer Schemaänderung kopieren und neu anlegen und dabei Trigger und Constraints verlieren (7). Das
bedingte Update steht in `custom-sql/`, nicht in `service/impl/`. `liferay-gemeinsam.md` Abschnitt 6 nennt
`**/upgrade/**` als mit erfasst; in der Tabelle von Abschnitt 5 fehlt das Muster.

**Hinweis für G4-L:** `ivy.xml`, `build.xml` und `ivy-settings.xml` des Plugins bzw. des SDK legen die Bibliotheken
und ihre Bezugsquellen fest. Sie sind von keinem Muster aus `liferay-gemeinsam.md` Abschnitt 5 erfasst; eine neue
Bibliothek fiele dort nur über die Liste in Abschnitt 7 auf. Vorschlag: `liferay-625/**/ivy*.xml` und
`liferay-625/**/build*.xml` aufnehmen.

## 3. Abbildung der Bausteine

Je Baustein nur, was 6.2.5 eigen ist; die gemeinsame Abbildung steht in `liferay-gemeinsam.md` 3.1. Alle Zeilen sind
„in P00 zu bestätigen“.

| Baustein | Mittel auf 6.2.5 | Hinweise |
| --- | --- | --- |
| Anmeldung | Login-Portlet des Portals mit Liferay-Konto (`company.security.auth.type=emailAddress`); Anmeldeseite des Themes über `auth.login.url`; Login-Aktion `login.events.post` bindet (gemeinsam 2.5) | Abweichung siehe 6.1; Folgeseiten des Portals (Nutzungsbedingungen, Erinnerungsfrage, Pflicht zum Passwortwechsel) abschalten, siehe 5.1 |
| Zugang je Anfrage | Servlet-Filter über `liferay-hook.xml` (`servlet-filter`, `servlet-filter-mapping`) auf die Seiten der Site „Berichtsheft“ | prüft `BH_Person` (aktiv, gebunden) und die 8 Stunden ab dem Anmeldezeitpunkt in der Sitzung (M02-R04, M02-R05); sonst Seite `kein_zugang` bzw. Abmelden |
| Rollen und Besitz | `*LocalServiceImpl` prüft gegen `BH_Person`; Liferay-Rollen „BH Azubi“, „BH Ausbilder“ nur für Seiten-Sichtbarkeit | Rechte der Seiten über die Site-Verwaltung bzw. die Testschnittstelle angelegt |
| Persistenz | Service Builder 6.2 (`liferay-service-builder_6_2_0.dtd`); `mvcc-enabled` gibt es dort voraussichtlich nicht und entfällt | gemeinsam 2.4 sieht das Entfallen vor |
| Transaktion | Methoden der `*LocalServiceImpl`; Spring-Transaktion des Portals; fachliche Fehler, die zurückrollen müssen, als Unterklassen von `PortalException`; `pflichtangaben_fehlen` beim Einreichen als Ergebnis, nicht als Ausnahme | nur `PortalException` und `SystemException` lösen sicher ein Zurückrollen aus; Methodennamen mit `get`, `is`, `has` laufen nur lesend (siehe 7) |
| Sperre und bedingtes Update | `*FinderImpl` mit `CustomSQLUtil` und `SQLQuery.executeUpdate()` in der Hibernate-Sitzung der Service-Transaktion | danach Entity- und Finder-Cache leeren und das Objekt aus der Hibernate-Sitzung lösen (`session.evict`) |
| Historie unveränderlich | Trigger nach gemeinsam 2.6 plus `ModelListener` (`BaseModelListener`), angemeldet in `service-ext.properties` mit `value.object.listener.de.berichtsheft.model.StatusChange` und `…Comment` | Nachweis im Abschnitt „Nachweis AK-505 und AK-508“ |
| Schema-Schritte | Service Builder legt Tabellen beim ersten Deployment an; `UpgradeProcess` des Plugins führt danach das Skript aus | Ort der Anmeldung (`upgrade.processes`, Release-Nummer) und Reihenfolge Tabellen → Skript in P00 nachweisen |
| Uhr | Spring-Bean des Plugins (`ext-spring.xml`) bzw. Einzelstück mit `Clock`-Schnittstelle; Betriebsart aus `PropsUtil.get("bh.betrieb")` | stellbar nur über die Testschnittstelle |
| Hintergrundjobs | `scheduler-entry` in `liferay-portlet.xml` mit `scheduler-event-listener-class`, Speicherart `MEMORY_CLUSTERED` | Quartz rechnet Cron-Ausdrücke in der JVM-Zeitzone (GMT); deshalb **Takt alle 15 Minuten**, die Fälligkeit (Montag 9:00 Uhr Europe/Berlin, Nachholen bis Dienstag 23:59 Uhr) entscheidet die Fachlogik (AK-1021, AK-1023) |
| Benachrichtigung in der App | `user-notification-definitions` und `UserNotificationHandler` in `liferay-portlet.xml`; Quelle bleibt `BH_Notification` (gemeinsam 2.5) | Glocke siehe 3.1 |
| E-Mail | synchron über `MailEngine.send` (aus `util-java.jar`) statt `MailServiceUtil` | `MailServiceUtil` verschickt asynchron über den Message Bus; Fehler kämen beim Ausgangskorb nicht an (Versuche, `lastError`, `failedAt`, M08). SMTP-Einstellungen aus `portal-ext.properties`; Einstellungen im Control Panel überschreiben sie (7) |
| Teams | wie gemeinsam 3.2 | – |
| PDF | PDFBox 2.0.37 (gemeinsam 7), Ressource-URL des Portlets (`serveResource`) | Schrift aus dem Plugin, kein Abruf aus dem Internet |
| Oberfläche | `MVCPortlet` mit JSPs, ein Portlet je Seite auf Seiten mit einspaltiger Layout-Vorlage; eigenes Theme | Seitenadressen siehe 4.3 |
| Theme-Daten | `servlet.service.events.pre`-Aktion legt Person, Darstellung, Zähler (Glocke, Prüfliste, Nicht zustellbar) als Request-Attribute ab; `portal_normal.vm` liest nur diese | `serviceLocator` ist in Velocity voreingestellt gesperrt (`velocity.engine.restricted.variables`) und bleibt es |
| Dunkelmodus | Tokens im Theme, `data-theme` vom Server; Umfang in 3.2 | – |
| Prüf-Adapter | JUnit (Ant) und Playwright für Node | Abschnitt 4 |
| Suchdienst | Lucene des Portals | `index.on.startup=false`; die App sucht nicht |

### 3.1 Glocke (M08-R16, M09-R03, UI-AK-03)

Die Glocke der Dockbar von 6.2 zeigt Liferay-Benachrichtigungen, aber nicht nach M09-R03 („99+“, genaue Zahl im Namen)
und nicht mit dem Markieren nach AK-1015. Vorschlag für 6.2.5: **eigene Glocke im Theme** aus `BH_Notification` mit der
Fachlogik von UI-AK-03 und AK-1015; die Dockbar ist für Azubis und Ausbilder ausgeblendet (sie ist fest oben und würde
den Fokus verdecken, UI-AK-17).

Das ist ein **Vorschlag**, keine Festlegung dieses Profils: Er weicht von `liferay-gemeinsam.md` 2.5 („die Glocke der
Plattform zeigt die Nachricht“) und von der Zeile „Benachrichtigung in der App“ der Bausteintabelle in
`docs/06-spec-architektur.md` ab; beides ändert nach `liferay-gemeinsam.md` Abschnitt 1 nur die gemeinsame Freigabe
(siehe „Bitte bestätigen“). Bis dahin gilt gemeinsam 2.5. **Abbild in `UserNotificationEvent`:** Vorschlag, es auf
6.2.5 trotzdem zu schreiben, nur damit nach dem Upgrade (U03) die Glocke von 7.2 die früheren Nachrichten zeigt, ohne
dass U03 sie nachträglich anlegt; angezeigt wird es auf 6.2.5 nicht. Die Alternative (kein Abbild auf 6.2.5,
`userNotificationEventId` bleibt leer, U03 legt die Einträge an) ist ebenso möglich; die Wahl gehört zu U00.

### 3.2 Dunkelmodus und UI-AK auf 6.2.5

**Umfang (Vorschlag):** Hell und Dunkel gelten für den Rahmen des Themes (Seitenleiste, Kopf, Schublade, Glocke), alle
Portlets der App und den Einstieg jeder Person: Anmeldeseite, „Passwort vergessen“ und „Passwort setzen“ aus dem Link
der Einladungsmail. Diese drei Seiten bekommen über denselben JSP-Hook (`custom-jsp-dir` `/html/hooks/login`; „Passwort
setzen“ ist `html/portal/update_password.jsp` und nur so überschreibbar) eigenes Markup mit Tokens (Login-Portlet und
die Seite des Portals zum Setzen des Passworts) und werden mit axe geprüft. Nicht umgestellt werden Seiten, die das
Portal selbst ausliefert und die keine Person der App erreicht: Control Panel (eigenes Theme des Portals, nur für den
Portal-Administrator, keine Person in `BH_Person`) und Fehlerseiten des Portals. Sie bleiben hell und sind nicht auf
WCAG geprüft; das ist „abweichend, begründet“ zu M09-R19 („alle Seiten … hell und dunkel“). PDF und Druckansicht bleiben
hell (wie `docs/05-ui-spezifikation.md`).

**Technik:**

- Tokens aus `docs/05-ui-spezifikation.md` („Design-Tokens“) als `<style>`-Block im `<head>` von `portal_normal.vm`,
  einmal für Hell, einmal für Dunkel (`[data-theme=dark]` und `@media (prefers-color-scheme: dark)` für
  `:root:not([data-theme=light])`), dazu `color-scheme`. Der Block steht absichtlich nicht in `custom.css`, weil der
  Sass-Compiler von 6.2 Namen wie `--bg` womöglich nicht unverändert durchlässt (P00 prüft das; dann wandern die Tokens
  in `custom.css`).
- `data-theme` setzt `portal_normal.vm` am `<html>`-Element aus dem Request-Attribut der `ServicePreAction`: Konto
  (`BH_Person.theme`) vor Cookie, ohne beides `System` (M09-R17, Fachlogik `darstellungErmitteln`). Damit steht das
  Schema vor dem ersten Darstellen fest, ohne Skript (M09-R18).
- Bootstrap 2 und AlloyUI haben feste Farben. Das Theme überschreibt die Klassen, die die App verwendet (`.btn`,
  `.alert`, `.table`, Formularfelder, `.control-group`), mit Tokens. Die App verwendet keine AlloyUI-Bausteine mit
  eigener Farbgebung (Dialog `aui-modal`, Datumsauswahl, `aui-loading-mask`), sondern eigenes Markup.
- Eigene Breakpoints 1024 px und 1280 px in `custom.css`; das Raster von Bootstrap 2 (feste Breiten, Umbrüche bei 768,
  980 und 1200 px) wird für die App-Seiten nicht verwendet.

**Bewertung je UI-AK** (alle „in P00 zu bestätigen“; „gleichwertig“ heißt: Die Prüffälle laufen unverändert):

| UI-AK | Umsetzung auf 6.2.5 | Bewertung |
| --- | --- | --- |
| UI-AK-01 | Seitenleiste und Schublade im Theme (`portal_normal.vm`, `main.js`), Fokusfalle und Escape von Hand | gleichwertig |
| UI-AK-02 | Menü im Theme aus den Request-Attributen (Rolle, Zähler), `aria-current`; Sichtbarkeit der Seiten über Liferay-Rollen, Schutz im Service | gleichwertig |
| UI-AK-03 | eigene Glocke nach 3.1 (Vorschlag); mit der Glocke der Dockbar nicht erfüllbar | gleichwertig, wenn der Vorschlag aus 3.1 freigegeben ist |
| UI-AK-04 | Portlet „Start“ (JSP), Fachlogik in `domain/` | gleichwertig |
| UI-AK-05 | Leerzustand im Portlet | gleichwertig |
| UI-AK-06 | eigenes CSS-Raster, Portlet auf einspaltiger Layout-Vorlage ohne Seitenränder des Portals | gleichwertig |
| UI-AK-07 | Fußleiste im Portlet, Zustand per Skript; Meldung nach dem Speichern über die Erfolgsmeldung des Portlets | gleichwertig |
| UI-AK-08 | Fehlerleiste im Portlet, Fokus per Skript nach dem Laden | gleichwertig |
| UI-AK-09 | Einreichen speichert in derselben Service-Transaktion zuerst (wie gemeinsam 2.4) | gleichwertig |
| UI-AK-10 | Prüfansicht als ein Portlet; ausgewählter Bericht als Render-Parameter in der Adresse, lesbar über eine `friendly-url-routes.xml` | gleichwertig |
| UI-AK-11 | nächster Bericht nach der Aktion per Weiterleitung | gleichwertig |
| UI-AK-12 | Berichtsseite mit Entscheidungsleiste unter 1024 px | gleichwertig |
| UI-AK-13 | Chips mit eingebetteten SVG-Symbolen (dieselben Formen wie die TypeScript-App), nicht Font Awesome 3 aus dem Portal | gleichwertig |
| UI-AK-14 | Fachlogik `darstellungPruefen`, `darstellungErmitteln` in Java; Speichern in `BH_Person.theme` und Cookie, danach Weiterleitung auf dieselbe Seite (wirkt sofort) | gleichwertig |
| UI-AK-15 | `data-theme` und Tokens im `<head>` vom Server, kein Skript nötig (UI-AK-15-01, UI-AK-15-02, UI-AK-15-03) | gleichwertig |
| UI-AK-16 | axe auf allen Seiten der Abläufe, hell und dunkel, 1280 und 375 px (UI-AK-16-01 bis UI-AK-16-04), einschließlich Anmeldeseite, „Passwort vergessen“ und „Passwort setzen“ (JSP-Hook) | gleichwertig für die Seiten der Abläufe; **abweichend, begründet** für die Seiten des Portals außerhalb der App (siehe Umfang) |
| UI-AK-17 | Dockbar für Azubis und Ausbilder ausgeblendet; „Abmelden“ im Menü des Themes; keine fest stehende Leiste des Portals | gleichwertig |
| UI-AK-18 | eigener Dialog (`<dialog>` bzw. eigenes Markup mit Fokusfalle), kein `aui-modal` | gleichwertig |
| UI-AK-19 | Seitentitel über `PortalUtil.setPageTitle` und eine Titelvorlage im Theme („<Seite> – Berichtsheft“); Portlet-Rahmen ohne Überschrift (`portlet.vm`, `portlet-decorate` aus), Seitenkopf ohne `h1` | gleichwertig |
| UI-AK-20 | Platzhalter nur dort, wo das Portlet Inhalte nachlädt (Ressource-URL); sonst liefert der Server die Seite fertig | gleichwertig |

## 4. Tests und Prüf-Adapter

### 4.1 Ebenen und Orte

| Ebene | Was | Ort | Befehl (im Ordner `liferay-625/portlets/bh-portlet/`) | Braucht |
| --- | --- | --- | --- | --- |
| Unit | eigene JUnit-Tests der Fachlogik und der `ModelListener` | `test/unit/**` | `ant test-unit` | Java 8 |
| Prüffälle `fachlogik` | JUnit-Runner `PruefungFachlogikTest` (parametrisiert, ein Test je Fall) über alle Fälle der Ebene `fachlogik` aus `specs/pruefung/*.json` | `test/unit/de/berichtsheft/pruefung/**` | `ant pruefung-fachlogik` | Java 8 |
| Datenhaltung | JUnit über JDBC gegen eine leere Datenbank mit `tables.sql` und dem Skript aus gemeinsam 2.6, ohne Portal | `test/db/**` | `ant test-db` | PostgreSQL, Datenbank `berichtsheft_l625_test` |
| Prüffälle `daten` | JUnit-Runner `PruefungDatenTest` ruft die Testschnittstelle des laufenden Portals über HTTP (`java.net.HttpURLConnection`) | `test/integration/de/berichtsheft/pruefung/**` | `ant pruefung-daten` | laufendes Portal mit `bh.betrieb=test` |
| Integration | eigene Tests gegen das laufende Portal (u. a. Gleichzeitigkeit AK-508) | `test/integration/**` | `ant test-integration` | wie oben |
| Prüffälle `ablauf` | Playwright für Node (Version des Repositorys), eigener Ablauf-Adapter | `liferay-625/e2e/` | `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375` (im Wurzelordner des Repositorys) | laufendes Portal mit `bh.betrieb=test` |

- **Ordner der Prüffälle:** Die Runner lesen `specs/pruefung/` über die Systemeigenschaft `bh.pruefung.dir`
  (Voreinstellung: drei Ordner über dem Plugin, also die Wurzel des Repositorys). Formate und Fehlercodes nach
  `specs/pruefung/format.md`, „Regeln für Adapter“.
- **JSON lesen:** Die JUnit-Runner brauchen eine JSON-Bibliothek; das Portal bringt keine mit, die ohne laufendes
  Portal nutzbar ist. Vorschlag für `liferay-gemeinsam.md` Abschnitt 7: Jackson Databind mit fester Version, nur im
  Test-Klassenpfad (Apache-2.0; ab 2.13 Java 8, Version in P00 auf Maven Central festlegen). Bei der Ausweiche Java 7
  bräuchte es Jackson 2.12.x und Ant 1.9.x, weil Ant 1.10 nur auf Java 8 läuft (siehe „Bitte bestätigen“).
- **Testnamen:** JUnit 4 erlaubt keinen Bindestrich im Methodennamen. Eigene Tests heißen `AK505_…`/`AK508_…` (Klasse
  oder Methode), die Runner benennen jeden Fall mit seiner ID (`@Parameters(name = "{0}")` → `AK-508-01 (M05.json,
  daten)`). Ob `npm run ak:abdeckung` Java-Tests mitzählt, klärt P10.
- **Fehlercodes:** Fachliche Fehler sind Unterklassen von `PortalException` mit einem festen Code (Aufzählung
  `Fehlercode`), außer `pflichtangaben_fehlen` beim Einreichen: Das ist ein Ergebnis mit Code, keine Ausnahme, damit die
  mitgeschickten Tage gespeichert bleiben (M05-R08, AK-505-03). `woche_ausserhalb` dagegen wird nach M05-R21 vor dem
  Speichern geprüft und rollt als Ausnahme zurück. Der Adapter liest den Code, nie den Meldungstext. Die Abweisung der
  Datenhaltung erkennt er am SQLSTATE `BH803` in der Ursachenkette (gemeinsam 2.6).
- **Abweichende Fälle:** Ein Fall mit `abweichend.liferay-625` wird nicht ausgeführt, sondern mit der Markierung
  „abweichend, begründet“ und dem Verweis als übersprungen ausgewiesen (JUnit: `Assume` mit Meldung; Playwright:
  `test.skip` mit Anmerkung `abweichend`). Er zählt nie als grün; ein Fall ohne Markierung, den der Runner nicht
  ausführen kann, lässt den Lauf scheitern.

### 4.2 Testschnittstelle (6.2.5)

Ein Servlet des Plugins unter `/bh-portlet/pruefung/zustand` (Gegenstück zu `src/app/api/test/zustand/route.ts`): Uhr
stellen und zurückstellen, Bestand leeren, Testdaten laden (`specs/pruefung/testdaten.json`), Ausgangsbestand
herstellen, Daten-Aktionen ausführen, Erinnerungslauf auslösen. Das Servlet steht fest in `web.xml` und antwortet bei
jeder Anfrage mit 404, wenn nicht `bh.betrieb=test` gilt (geprüft je Anfrage, nicht nur beim Start). Ein Anmelden per
`ServletContext.addServlet` aus einem Listener scheitert in 6.2 vermutlich (`IllegalStateException`); in P00 zu
bestätigen.

**Aktionen „an der Fachlogik vorbei“** (`historie_aendern`, `historie_loeschen`, `bericht_loeschen`, M06): Die
Testschnittstelle führt sie mit direktem SQL über eine JDBC-Verbindung des Portals aus (`DataAccess.getConnection()`),
nicht über die Persistenz von Service Builder. So zeigen AK-803-01 bis AK-803-04 den Trigger (Ergebnis `BH803` →
`historie_unveraenderlich`); über die Persistenz fiele schon der `ModelListener` ins Gewicht und der Trigger bliebe
ungeprüft. Den `ModelListener` prüft nur `AK803_ModelListenerTest`. Nach jeder Aktion mit direktem SQL leert die
Testschnittstelle Entity-, Finder- und Hibernate-Sitzungs-Cache der betroffenen Entities (gemeinsam 2.4).

Beim Laden der Testdaten legt die Schnittstelle je Person ein Liferay-Konto mit der E-Mail aus den Testdaten und einem
Demo-Passwort an (Platzhalter aus der Konfiguration, kein Geheimnis); Personen mit `"angelegt": false` bekommen nur das
Konto, keinen Eintrag in `BH_Person` (Gegenprobe zu AK-102).

### 4.3 Ablauf-Adapter (Playwright)

Der Runner übernimmt Ablauf und Prüfungen aus `e2e/pruefung-ablauf.spec.ts`, `e2e/pruefung/ablauf-adapter.ts` und
`tests/pruefung/cases.ts`; eigen für 6.2.5 sind nur die Adressen, die Anmeldung und die Testschnittstelle:

- **Seiten:** `anmelden` → `/web/berichtsheft/anmelden` (zugleich `auth.login.url`), `kein_zugang` →
  `/web/berichtsheft/kein-zugang`, `start` → `/web/berichtsheft/start` (Landeseite nach dem Login über
  `default.landing.page.path`), `wochen`, `pruefliste`, `azubis`, `personen`, `nicht_zustellbar`,
  `benachrichtigungen`, `einstellungen` als Seiten der Site mit gleichnamiger Adresse; `bericht` über die Adresse aus
  `friendly-url-routes.xml`. Die Liste legt P00 fest.
- **Merker:** dieselben festen Merker wie in der TypeScript-App (`data-status`, `data-woche`, `data-fehler`,
  `data-feld`, `data-warnung-verlassen`, `data-anmeldeweg` …); Portlets und Theme setzen sie.
- **`anmelden`:** E-Mail und Demo-Passwort ins Login-Portlet, bis die Landeseite erscheint. **`abmelden`:** „Abmelden“
  im Menü des Themes (`/c/portal/logout`), danach `default.logout.page.path` auf die Anmeldeseite.
- **`netz: langsam`:** verzögert werden Ressource-Aufrufe der Portlets (`p_p_lifecycle=2`), nicht Seitenaufrufe.
- Ob der Adapter der TypeScript-App sich mit einer Adresstabelle für beide Plattformen nutzen lässt, statt kopiert zu
  werden, entscheidet P00 (das ändert Dateien unter `e2e/` und braucht einen eigenen Auftrag).

## 5. Lokaler Start, Cloud-Sitzung und CI

### 5.1 Lokaler Start und Cloud-Sitzung

Container starten in der Cloud-Sitzung nicht (`CLAUDE.md`); alles läuft nativ. G4 installiert nichts; JDK und Bundle
kommen in P00 ins Startskript (`liferay-gemeinsam.md`, „Hinweis für KE-S01“).

1. `openjdk-8-jdk-headless` und `ant` aus den Ubuntu-Paketen; `JAVA_HOME` auf Java 8, nur für die Liferay-Befehle
   (Java 21 bleibt für den Rest der Sitzung). `JAVA_TOOL_OPTIONS` leer starten wie bei Keycloak in `CLAUDE.md`;
   Proxy und Zertifikate für Ivy und Java 8 nach den Hinweisen der Sitzung (P00 hält den Weg fest).
2. Bundle und Plugins SDK von SourceForge in einen Ordner außerhalb des Repositorys entpacken (ignoriert, nicht
   eingecheckt); JDBC-Treiber 42.7.14 nach `tomcat-7.0.62/lib/ext/`, alten Treiber entfernen.
3. Datenbanken `berichtsheft_l625` (Portal und App) und `berichtsheft_l625_test` (nur `ant test-db`) für die Rolle
   `berichtsheft` anlegen.
4. `portal-ext.properties` aus `liferay-625/config/portal-ext.beispiel.properties` (Platzhalter ersetzen):
   - Datenbank: `jdbc.default.driverClassName=org.postgresql.Driver`, URL, Benutzer, Passwort der Demo;
   - `setup.wizard.enabled=false`, `bh.betrieb=test` (nur Sitzung und CI), `bh.teams.modus`;
   - Anmeldung: `company.security.auth.type=emailAddress`, `company.security.strangers=false`,
     `company.security.auto.login=false` (kein „Angemeldet bleiben“ über 8 Stunden hinaus),
     `terms.of.use.required=false`, `users.reminder.queries.enabled=false`, `auth.login.url`,
     `default.landing.page.path`, `default.logout.page.path`, `auth.forward.by.last.path=true` (Rücksprungziel,
     AK-1003);
   - Sitzung: `session.timeout=480`, `session.timeout.warning=0` (kein Dialog des Portals),
     `session.timeout.auto.extend=false`;
   - persönliche Seiten aus: `layout.user.private.layouts.enabled=false`, `layout.user.public.layouts.enabled=false`;
   - SMTP: Mailpit bzw. SMTP-Mock, Port 1025.
5. Start: `tomcat-7.0.62/bin/catalina.sh run` (mit `setenv.sh` des Bundles, `-Duser.timezone=GMT`, Heap 2 GB als
   Ausgangswert); einmal mit `TZ=Europe/Berlin` für den Zeitzonen-Nachweis (gemeinsam 2.2).
6. `ant build-service deploy` im Plugin, `ant deploy` im Theme; warten auf die Meldung im Tomcat-Log (2.2).
7. Site „Berichtsheft“, Seiten, Rollen und Rechte legt die Testschnittstelle bzw. ein `UpgradeProcess` an
   (reproduzierbar, nicht von Hand im Control Panel).

Dauer und Speicher misst P00 (`docs/06-spec-architektur.md`, „Risiken“).

### 5.2 CI

- Eigener Workflow nur bei Änderungen unter `liferay-625/**` und bei bereiten PRs (`docs/ci-richtlinie.md`); Bundle,
  SDK und Ivy-Zwischenspeicher aus dem Actions-Cache.
- Schnelle Stufe ohne Portal: `ant test-unit`, `ant pruefung-fachlogik`, `ant test-db` (PostgreSQL als
  Dienst-Container).
- Volle Stufe: Portal starten (natives Bundle wie in der Sitzung oder Docker Hub `liferay/portal:6.2.5-ga6`, falls
  dessen Java-Version und PostgreSQL-Treiber passen, P00), dann `ant pruefung-daten`, `ant test-integration` und der
  Playwright-Lauf; Firefox und Edge nur in CI. Mailpit als Dienst-Container.
- Öffentliches Repository: nur Testdaten, Demo-Passwörter als Platzhalter, keine Geheimnisse in
  `portal-ext.properties`; Logs des Portals enthalten keine echten Personendaten.

## 6. Bewusste Abweichungen

### 6.1 Anmeldung mit Liferay-Konten statt Firmenkonto (M02)

Entschieden in `docs/06-spec-architektur.md`, „Bewusste Abweichung, bereits entschieden“. Auf 6.2.5 meldet sich jede
Person im Login-Portlet mit E-Mail und Passwort ihres Liferay-Kontos an; der Anmeldedienst ist das Portal selbst. Die
App speichert kein Passwort (das tut Liferay), die Konto-ID ist `User_.userId`, das Binden läuft nach
`liferay-gemeinsam.md` 2.5. Einen Test-Zugang ohne Konto braucht 6.2.5 nicht; die Ablauf-Fälle melden sich mit
Demo-Konten an, die nur bei `bh.betrieb=test` angelegt werden.

| AK | Betroffen | Bewertung auf 6.2.5 |
| --- | --- | --- |
| AK-101 | Anmeldung über das Firmenkonto, kein Passwort in der App | **teilweise abweichend, begründet.** Die Anmeldeseite hat ein Passwortfeld, und der Anmeldeweg ist das Liferay-Konto. Betroffen ist nur AK-101-01 (Anmeldeseite: `passwortfeld`, `anmeldewege`). AK-101-02 und AK-101-03 prüfen die Startseite nach der Anmeldung und sind erfüllbar (gleichwertig). Was bleibt: kein Passwort in den App-Tabellen; Anmelden führt zur Startseite der Rolle. |
| AK-102 | Kein Zugang ohne Person oder bei deaktivierter Person | gleichwertig. Fachlogik unverändert (AK-102-01 bis AK-102-09). Die App deaktiviert das Liferay-Konto nicht mit; die Anmeldung beim Portal gelingt, der Filter zeigt `kein_zugang` mit dem Hinweis nach M02-R03. Sonst sähe die Person die Meldung des Portals statt des Hinweises. |
| AK-106 | Nach dem Abmelden kein Zugriff | **teilweise abweichend, begründet.** AK-106-01 prüft am Ende die Anmeldeseite (`passwortfeld: false`, `anmeldewege: ["firmenkonto"]`) wie AK-101-01 → abweichend. AK-106-02 gleichwertig. M02-R05 („Abmelden beendet auch die Anmeldung beim Anmeldedienst“) ist erfüllt, weil das Portal selbst der Anmeldedienst ist. |
| AK-201 | Binden beim ersten Login über die bestätigte E-Mail | gleichwertig mit einer Auslegung: „bestätigt“ ist `User.isEmailAddressVerified()` des Liferay-Kontos. Fachlogik unverändert (AK-201-01 bis AK-201-11). Wie ein vom Admin angelegtes Konto bestätigt wird (Bestätigungsmail des Portals oder „bestätigt“ durch das Setzen des Passworts über den Link an diese Adresse), klärt P00 (siehe „Bitte bestätigen“). |
| AK-204 | Deaktivieren wirkt sofort | gleichwertig über den Filter je Anfrage (M02-R04); das Liferay-Konto bleibt aktiv (siehe AK-102). |
| AK-103, AK-104, AK-105, AK-202, AK-203, AK-205, AK-206, AK-207, AK-208, AK-209 | – | nicht betroffen; Prüfung im Service gegen `BH_Person` |

Sitzung höchstens 8 Stunden (M02-R05): Liferays `session.timeout` misst nur Untätigkeit. Die Login-Aktion vermerkt den
Anmeldezeitpunkt aus der Uhr in der Sitzung, der Filter meldet nach 8 Stunden ab; „Angemeldet bleiben“ ist aus (5.1).
Damit gleichwertig, kein Prüffall (wie in der TypeScript-App).

Die Markierung `"abweichend": { "liferay-625": "profile/liferay-625.md, Abschnitt 6.1" }` gehört in die Prüffälle
AK-101-01 und AK-106-01. Dieses Paket ändert `specs/**` nicht; die Markierung setzt ein eigener
Auftrag nach der Freigabe (siehe „Bitte bestätigen“).

### 6.2 Oberfläche

- Seiten des Portals außerhalb der App bleiben hell und ungeprüft (3.2, UI-AK-16): **abweichend, begründet.**
- Glocke im Theme statt der Glocke der Plattform (3.1): nur Vorschlag; er weicht von `liferay-gemeinsam.md` 2.5 und
  der Bausteintabelle in `docs/06-spec-architektur.md` ab, nicht von einer Fach-Spec.

### 6.3 Gemeinsame Abweichungen

Kalendertage als Text, `TIMESTAMP` in UTC, `seq` je Bericht, Trigger plus `ModelListener` usw. stehen in
`liferay-gemeinsam.md`, Abschnitt 8, und gelten für 6.2.5 unverändert.

## 7. Fallstricke und Grenzen

- **Kein Herstellersupport, keine Sicherheitsupdates:** nur Demo und Übung, kein Produktivbetrieb.
- **Service Builder liest Java-Quellen mit einem alten Parser:** `*LocalServiceImpl` und andere Klassen, aus denen
  Service Builder Schnittstellen erzeugt, ohne Java-8-Syntax (keine Lambdas, keine Methodenreferenzen, keine
  `default`-Methoden). Java 8 nur in `domain/` und in Klassen, die Service Builder nicht liest. Ebenso keine
  Java-8-Syntax in JSPs (Jasper von Tomcat 7). In P00 zu bestätigen.
- **Lesende Transaktionen:** Service-Methoden mit `get`, `is`, `has`, `search`, `dynamicQuery` am Anfang laufen nur
  lesend. Statuswechsel und Speichern heißen deshalb z. B. `submitReport`, `saveDays`, nie `get…`.
- **Zurückrollen:** Nur `PortalException` und `SystemException` rollen die Transaktion sicher zurück. Fehler, die
  nichts hinterlassen dürfen (Konflikt, ungültige Eingaben nach AK-505-04, fehlende Rechte), sind deshalb
  `PortalException`; ein Konflikt nach dem bedingten Update muss zurückrollen, damit kein Historieneintrag entsteht.
  **Umgekehrt** darf `pflichtangaben_fehlen` beim Einreichen nicht werfen: Die mitgeschickten Tage sind dann schon in
  derselben Transaktion gespeichert und müssen als Entwurf bleiben (M05-R08, AK-505-03). Der Service gibt ein Ergebnis
  mit dem Code zurück, die Transaktion endet normal. `woche_ausserhalb` wird nach M05-R21 vor dem Speichern geprüft
  und ist eine Ausnahme, die zurückrollt.
- **`build.auto.upgrade`:** steht auf `false`. Ein automatisches Schema-Upgrade kopiert Tabellen und legt sie neu an;
  dabei gingen Trigger, Fremdschlüssel und CHECK-Constraints verloren, und die Trigger der Historie würden das
  Umkopieren abweisen. Schemaänderungen nur als eigener `UpgradeProcess`.
- **Cache nach Custom SQL und Kaskade:** nach dem bedingten Update und nach dem endgültigen Löschen Entity-, Finder-
  und Hibernate-Sitzungs-Cache leeren (gemeinsam 2.4); sonst liest Service Builder den alten Stand.
- **Hot Deploy ist asynchron:** `ant deploy` kehrt zurück, bevor das Plugin bereit ist; Tests warten auf die Meldung im
  Tomcat-Log bzw. auf eine Antwort der Testschnittstelle.
- **Mehrere Klassenlader:** Theme und Portal sehen die Klassen des Plugins nicht. Daten fürs Theme nur über
  Request-Attribute (3); deshalb ein einziges Plugin (2.1).
- **Scheduler in GMT:** Cron-Ausdrücke rechnen in der Zeitzone der JVM; nie „9:00 Uhr“ als Cron-Ausdruck schreiben
  (3, Hintergrundjobs).
- **Mail:** `MailServiceUtil` ist asynchron und verschluckt Fehler; Einstellungen im Control Panel überschreiben
  `portal-ext.properties` (Mailpit-Port prüfen, wenn Mails fehlen).
- **Sass des Themes:** Der Sass-Compiler von 6.2 ist alt (Ruby-Sass über JRuby, in P00 zu bestätigen); CSS-Variablen,
  `:not()` mit Attributen und `@media (prefers-color-scheme)` erst nach Nachweis in `custom.css`. Übersetzt wird beim
  Deployment; ein Fehler fällt erst im Tomcat-Log auf.
- **Portal-Bausteine mit festen Farben und eigenem Verhalten:** Dockbar (fest oben), Sitzungswarnung (`aui`-Dialog),
  Portlet-Rahmen mit `h1`, AlloyUI-Dialoge. Für die App aus bzw. ersetzt (3.2), sonst brechen UI-AK-16, UI-AK-17 und
  UI-AK-19.
- **Folgeseiten der Anmeldung:** Nutzungsbedingungen, Erinnerungsfrage und Pflicht zum Passwortwechsel schieben sich
  zwischen Anmelden und Startseite; in Sitzung und CI aus (5.1), sonst scheitert jeder Ablauf-Fall beim `anmelden`.
- **Java 8 auf 6.2:** `-XX:MaxPermSize` aus `setenv.sh` ist unter Java 8 wirkungslos (Warnung im Log). Läuft 6.2.5
  nicht stabil mit Java 8, gilt die Ausweichregel Java 7 (gemeinsam 3.2); Java 7 ist in der Sitzung nicht beziehbar,
  nur in CI über ein Image. Dann reicht die Ausweichregel allein nicht: Ant 1.10 läuft erst ab Java 8 (also Ant 1.9.x),
  Jackson ab 2.13 ebenso (also 2.12.x), und `javac.source`/`javac.target` bleiben auf `1.7`.
- **PostgreSQL 16:** neuer als jede Version, mit der 6.2 getestet wurde (gemeinsam 4.5); ein alter Treiber kann sich
  nicht anmelden (SCRAM).
- **Oberfläche nur sinngemäß:** Bootstrap 2 ist nicht für kleine Bildschirme zuerst gebaut; Breiten und Raster kommen
  aus dem eigenen CSS.
- **Größe:** Portal, Datenbank und Browser zusammen sind auf dem Standard-Runner eng; P00 misst Speicher und Laufzeit.

## Nachweis AK-505 und AK-508

Grundlage: `liferay-gemeinsam.md` 2.4 (Versionsspalte, bedingtes Update) und 2.6 (Trigger plus `ModelListener`). Die
Tests entstehen in P05 (M05, Status und Prüfung) und P06 (M06, Historie); das Skript der Datenhaltung entsteht mit dem
Schema in dem Playbook, das Service Builder einführt.

### AK-505: schreibgeschützt nach dem Einreichen, Historie unveränderlich

| Schicht | 6.2.5-Mittel | Prüffall | JUnit-Test (Ort, Playbook) |
| --- | --- | --- | --- |
| Fachlogik | `darfBearbeiten` in `domain/` | AK-505-05, AK-505-06, AK-505-07 | `PruefungFachlogikTest` (`ant pruefung-fachlogik`, P05) |
| Service | Speichern sperrt die Zeile (`FOR UPDATE`), prüft dann Status und Person, sonst `nicht_bearbeitbar`; Einreichen speichert mit | AK-505-01, AK-505-02, AK-505-03, AK-505-04 | `PruefungDatenTest` (`ant pruefung-daten`, P05); AK-505-03 verlangt, dass `pflichtangaben_fehlen` nicht zurückrollt (7, „Zurückrollen“) |
| Datenhaltung: Tage | Trigger `report_day_locked` (gemeinsam 2.6), meldet `P0001` | kein neutraler Fall | `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest` in `test/db/` (P05): Bericht per SQL auf `SUBMITTED`, dann `UPDATE BH_ReportDay` per JDBC → Abweisung mit SQLSTATE `P0001`; Gegenprobe: im Entwurf gelingt dasselbe Update |
| Datenhaltung: Historie | Trigger `status_change_no_update`, `status_change_no_delete`, `comment_no_update`, `comment_no_delete`, `weekly_report_delete_guard` mit SQLSTATE `BH803` | AK-803-01, AK-803-02, AK-803-03, AK-803-04 (Testschnittstelle mit direktem SQL, 4.2), AK-803-05 | `PruefungDatenTest` (P06) und `AK803_TriggerDerHistorieTest` in `test/db/` (P06): `UPDATE` und `DELETE` auf `BH_StatusChange` und `BH_Comment` per JDBC → `BH803`; Löschen der Person per Kaskade gelingt |
| App: Historie | `ModelListener` auf `StatusChange` und `Comment` (`onBeforeUpdate`, `onBeforeRemove` → `ModelListenerException` mit Grund `historie_unveraenderlich`), angemeldet in `service-ext.properties` | kein neutraler Fall (die Daten-Fälle gehen an der Persistenz vorbei, 4.2) | `AK803_ModelListenerTest` in `test/unit/` (P06): Listener weist Ändern und Löschen ab; Gegenprobe: Anlegen geht durch |

Fehlergrund: Der Daten-Adapter liefert `historie_unveraenderlich` bei `BH803` in der Ursachenkette oder bei der
`ModelListenerException` mit diesem Grund; `nicht_bearbeitbar` kommt aus der Fehlerart des Service, nie aus dem
Meldungstext. Die Kaskade beim endgültigen Löschen (AK-803-05, AK-206) läuft nur in der Datenbank (gemeinsam 2.4); der
`ModelListener` greift dort nicht, weil Service Builder die Kinder nicht löscht.

### AK-508: Versionsspalte von Hand, bedingtes Update, Fehlergrund

| Schicht | 6.2.5-Mittel | Prüffall | JUnit-Test (Ort, Playbook) |
| --- | --- | --- | --- |
| Fachlogik | Reihenfolge der Prüfungen und Codes nach M05-R20, M05-R21 in `domain/` | AK-508-06, AK-508-07, AK-508-08, AK-508-09, AK-508-10, AK-508-11 | `PruefungFachlogikTest` (P05) |
| Service | `*LocalServiceImpl` in einer Transaktion: `SELECT … FOR UPDATE` über `*FinderImpl`, Prüfung gegen den gesehenen Stand (Status und `version`), bedingtes `UPDATE BH_WeeklyReport … WHERE status = ? AND version = ?` mit genau einer Zeile, sonst `PortalException` mit Konfliktcode; Historie im selben Lauf; danach Cache leeren | AK-508-01, AK-508-02, AK-508-03, AK-508-04, AK-508-05 | `PruefungDatenTest` (P05) |
| Datenhaltung | Zeilensperre und bedingtes Update in PostgreSQL | kein neutraler Fall (M05 Abschnitt 10) | `AK508_SperreUndBedingtesUpdateTest` in `test/db/` (P05): (1) zwei JDBC-Verbindungen: A sperrt und wechselt den Status, B wartet auf die Sperre und ändert danach mit dem alten Status 0 Zeilen; (2) Folge A-B-A: gesehen ist „Eingereicht“ mit `version` n, inzwischen zurückgezogen und erneut eingereicht („Eingereicht“, n+2); das bedingte Update mit `version = n` ändert 0 Zeilen (der Service macht daraus `inzwischen_geaendert` nach M05-R20; diesen Weg zeigt AK-508-04). Gegenprobe zu (2): ohne die Bedingung auf `version` ändert dasselbe Update 1 Zeile, nur die Version unterscheidet den Fall |
| Ganze App | zwei gleichzeitige Aufrufe über die Testschnittstelle | kein neutraler Fall | `AK508_ZweiGleichzeitigeAktionenTest` in `test/integration/` (P05): „AK-508 von zwei gleichzeitigen Aktionen gelingt genau eine“ (gemeinsam 2.4); zwei Threads mit Startschranke rufen Freigeben und Zurückziehen auf demselben Stand; genau eine gelingt, die andere liefert `bericht_zurueckgezogen` bzw. `bereits_geprueft`; genau ein neuer Eintrag in `BH_StatusChange`, `version` um 1 erhöht |

Fehlergrund: Der Service wirft je Konflikt eine `PortalException` mit festem `Fehlercode` (`bericht_zurueckgezogen`,
`bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`, `bereits_zurueckgenommen`,
`inzwischen_geaendert`); die Testschnittstelle gibt ihn als `{ "fehler": "<code>" }` zurück. Ändert das bedingte
Update keine Zeile, obwohl die Prüfung unter der Sperre durchging, ist das ein Fehler der Fachlogik: Der Service rollt
zurück und meldet `inzwischen_geaendert` (zweite Sicherung nach gemeinsam 2.4).

## Bitte bestätigen

- [ ] Plattform-Schlüssel `liferay-625` für `abweichend` in den Prüffällen.
- [ ] Markierung „abweichend, begründet“ für AK-101-01 und AK-106-01 (6.1); AK-101-02 und AK-101-03 bleiben ohne; das
      Eintragen in `specs/pruefung/M02.json` übernimmt ein eigener Auftrag nach Freigabe.
- [ ] „Bestätigte E-Mail“ auf 6.2.5 = `User.isEmailAddressVerified()`; ob das Setzen des Passworts über den Link an
      die Firmen-E-Mail als Bestätigung zählt, entscheidet Chris nach P00 (AK-201).
- [ ] Die App deaktiviert das Liferay-Konto beim Deaktivieren der Person nicht mit (AK-102, AK-204).
- [ ] Dunkelmodus-Umfang nach 3.2: App, Rahmen, Anmeldeseite, „Passwort vergessen“ und „Passwort setzen“ hell und
      dunkel; Control Panel und Fehlerseiten des Portals bleiben hell und ungeprüft (**abweichend, begründet** zu
      M09-R19, UI-AK-16).
- [ ] **Vorschlag für `liferay-gemeinsam.md` 2.5 und die Bausteintabelle in `docs/06-spec-architektur.md`**
      („Benachrichtigung in der App“): eigene Glocke im Theme aus `BH_Notification` statt der Glocke der Dockbar (3.1);
      das Abbild in `UserNotificationEvent` wird nur für U03 weitergeführt, nicht angezeigt (Alternative in 3.1, Wahl in
      U00).
- [ ] **Vorschlag für `liferay-gemeinsam.md` Abschnitt 7:** Testbibliothek Jackson Databind mit fester Version (ab
      2.13 Java 8; Version in P00), nur Test-Klassenpfad; bei der Ausweiche Java 7 Jackson 2.12.x und Ant 1.9.x.
- [ ] **Vorschlag für `liferay-gemeinsam.md`:** Paketwurzel `de.berichtsheft` auf beiden Plattformen.
- [ ] Ein einziges Plugin `bh-portlet` (Portlets, Hook, Service, Scheduler, Testschnittstelle) plus Theme (2.1).
- [ ] `pflichtangaben_fehlen` beim Einreichen als Ergebnis statt Ausnahme, damit die Tage gespeichert bleiben (7).
- [ ] Erinnerung und Ausgangskorb mit Takt alle 15 Minuten, Fälligkeit aus der Fachlogik (3).
- [ ] E-Mail synchron über `MailEngine.send` statt `MailServiceUtil` (3).
- [ ] **Pfadmuster für AM-R04, Korrekturen zu `liferay-gemeinsam.md` Abschnitt 5 (Spalte 6.2.5)**, zur Übernahme durch
      G4-L:

| Zeile in gemeinsam 5 | Bisher | Ergänzung | Grund |
| --- | --- | --- | --- |
| Anmeldung, Binden | `liferay-625/**/hook/**`, `liferay-625/**/liferay-hook.xml`, `liferay-625/**/portal.properties` | `liferay-625/**/html/hooks/login/**` | JSP-Hook der Anmeldeseite, „Passwort vergessen“ und „Passwort setzen“ |
| Konfiguration, Betriebsart, Testschnittstelle | `liferay-625/**/portal-ext.properties`, `liferay-625/**/pruefung/**` | `liferay-625/**/portal-ext*.properties`, `liferay-625/**/web.xml` | Vorlage `portal-ext.beispiel.properties`; `web.xml` trägt das Servlet der Testschnittstelle ein |
| Schema und Schutz in der Datenhaltung | `liferay-625/**/service.xml`, `liferay-625/**/sql/**`, `liferay-625/**/model/listener/**` | `liferay-625/**/upgrade/**`, `liferay-625/**/custom-sql/**`, `liferay-625/**/portlet.properties`, `liferay-625/**/service*.properties`, `liferay-625/**/portlet-model-hints.xml` | Skript als `UpgradeProcess`; Sperre und bedingtes Update; Upgrade-Prozesse (Ort in P00); `ModelListener` und `build.auto.upgrade` in `service-ext.properties`; Spaltenlängen |

Bestätigt ohne Änderung: die Zeilen zu Filter und Sitzung, Zugangsregeln (`domain/access`), Rollen- und
Besitzprüfung (`service/impl`, `service/permission`) und Rechten der Portlets. Nicht erfasst und als Hinweis für G4-L
(2.3): `ivy.xml`, `build.xml` und `ivy-settings.xml`; Vorschlag `liferay-625/**/ivy*.xml`, `liferay-625/**/build*.xml`.

## In P00 zu bestätigen

1. Bundle 6.2.5 GA6 startet mit OpenJDK 8; Tomcat-Version im Bundle; Speicher und Startzeit.
2. Portal auf PostgreSQL 16 mit JDBC 42.7.14; alter Treiber entfernt.
3. Plugins SDK baut mit Ant aus Ubuntu und Ivy nur aus Maven Central; Ant-Ziele für Tests in `build.xml`;
   `javac.source`/`javac.target` auf `1.8` angehoben; ob Spring 3 und ASM des Portals Klassen der Version 52 (Java 8)
   lesen; feste Jackson-Version auf Maven Central. Bezugsquelle für Ant 1.9.x, falls die Ausweiche Java 7 greift (kein
   Paket für Ubuntu 24.04; nur für CI nötig).
4. Service Builder 6.2: `namespace` `BH`, erzeugte `tables.sql` gegen `liferay-gemeinsam.md` 2.3; `mvcc-enabled` in
   der DTD von 6.2 nicht vorhanden; `build.auto.upgrade=false` wirkt.
5. Reihenfolge beim ersten Deployment: Tabellen von Service Builder, danach `UpgradeProcess` mit dem Skript aus
   gemeinsam 2.6; wo `upgrade.processes` und die Release-Nummer stehen (`portlet.properties` oder
   `service.properties`/`service-ext.properties`).
6. `ModelListener` für Entities des Plugins über `value.object.listener.*` in `service-ext.properties` (gelesen über
   `ServiceProps` der `*PersistenceImpl`); `build.auto.upgrade=false` dort.
7. Hook-Teile (`login.events.post`, `servlet.service.events.pre`, Servlet-Filter, JSP-Hook) im selben Portlet-Plugin.
8. Service Builder verarbeitet `*LocalServiceImpl` nur ohne Java-8-Syntax; Jasper von Tomcat 7 ebenso.
9. Lesende Transaktionen nach Methodenpräfix; Zurückrollen bei `PortalException`.
10. `SQLQuery.executeUpdate()` liefert die Zahl geänderter Zeilen; `SELECT … FOR UPDATE` und `FOR UPDATE SKIP LOCKED`
    in Custom SQL; Cache leeren danach.
11. JVM in GMT, JDBC-Sitzung in UTC, auch mit `TZ=Europe/Berlin` (gemeinsam 2.2).
12. Scheduler: `scheduler-entry` mit Takt 15 Minuten, Speicherart, Verhalten nach Neustart.
13. `MailEngine.send` synchron mit Fehler; eigene `Message-ID` setzbar.
14. `UserNotificationHandler` und Verhalten der Dockbar-Glocke (3.1).
15. Login: Folgeseiten abschaltbar (Nutzungsbedingungen, Erinnerungsfrage, Passwortwechsel); `auth.login.url`,
    Landeseite, Abmeldeseite, Rücksprungziel; `company.security.auto.login=false`; `session.timeout.warning=0`.
16. `custom-jsp-dir` `/html/hooks/login` überschreibt Login-Portlet und `update_password.jsp` für Anmeldeseite,
    „Passwort vergessen“ und „Passwort setzen“. Bestätigte E-Mail: Wert von `emailAddressVerified` bei vom Admin
    angelegten Konten und wie er wahr wird.
17. Sass des Themes: CSS-Variablen, `var()`, `@media (prefers-color-scheme)`; sonst Tokens im `<head>`.
18. Theme mit Eltern-Theme `_styled`; Portlet-Rahmen ohne `h1`; Dockbar ausblendbar je Rolle; Titelvorlage.
19. Testschnittstelle als festes Servlet in `web.xml` mit 404 außer bei `bh.betrieb=test` (`ServletContext.addServlet`
    aus einem Listener scheitert vermutlich mit `IllegalStateException`); `PropsUtil.get("bh.betrieb")` liest
    eigene Schlüssel aus `portal-ext.properties`.
20. Seitenadressen der Site „Berichtsheft“ und `friendly-url-routes.xml` für den Bericht.
21. Docker-Hub-Image `liferay/portal:6.2.5-ga6` für CI: Java-Version, Treiber, Startzeit; sonst eigenes Image.
22. Java 8 statt Java 7; sonst Ausweichregel aus gemeinsam 3.2.
