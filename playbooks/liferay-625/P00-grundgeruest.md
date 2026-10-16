# P00 Grundgerüst

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket G) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Ein leeres Liferay 6.2.5 mit dem Plugin `bh-portlet` und dem Theme `bh-theme` startet auf Java 8 und PostgreSQL 16, die
Testschnittstelle antwortet, die Prüf-Runner der drei Ebenen laufen, die Testdaten sind eingelesen, Speicher und
Laufzeit sind gemessen und die CI-Klasse L62 hat ihre Jobs. Fertig, wenn:

1. JDK und Bundle nach `profile/liferay-gemeinsam.md` 4.1 und 4.2 bezogen sind (OpenJDK 8 aus dem Ubuntu-Archiv,
   Tomcat-Bundle und Plugins SDK 6.2.5 GA6 von SourceForge) und das Startskript sie bei Bedarf einrichtet (Schritt 3).
2. `ant compile`, `ant war` und `ant deploy` im Plugin und im Theme laufen; das Tomcat-Log meldet
   „1 portlet for bh-portlet is available for use“; `GET /bh-portlet/pruefung/zustand` antwortet bei `bh.betrieb=test`
   mit 200 und sonst mit 404 (geprüft je Anfrage).
3. Die Runner `PruefungFachlogikTest`, `PruefungDatenTest` und der Ablauf-Runner unter `liferay-625/e2e/` laden alle
   Dateien aus `specs/pruefung/` (außer `testdaten.json`). Fälle ungebauter Module erscheinen sichtbar als „noch nicht
   gebaut“, Fälle mit `abweichend.liferay-625` als „abweichend, begründet“; keiner wird still übersprungen, keiner
   zählt als grün.
4. `specs/pruefung/testdaten.json` (Anna, Bernd, Clara, Dora, Emil) ist gelesen und in einem JUnit-Test geprüft.
5. Die **Messung** aus Schritt 13 liegt vor: Speicher und Laufzeit für Bundle-Start, Build und Testlauf, in der Sitzung
   und auf dem Standard-Runner von GitHub Actions.
6. Die **CI-Klasse L62** aus `docs/ci-richtlinie.md` (Klassentabelle, Zeile „L62 Liferay 6.2.5“, Pfad `liferay-625/**`)
   hat ihre schnelle und volle Stufe (Schritt 14); ein PR nur unter `liferay-625/**` löst nur den Liferay-6.2.5-Job aus.
7. Jeder Punkt aus „In P00 zu bestätigen“ des Profils (1 bis 22) hat einen Eintrag „bestätigt“, „abweichend, begründet“
   oder „offen bis Pnn“ (Schritt 15). Die Umsetzung hat keinen Fachcode.

Dieses Playbook gehört keinem Fach-Modul und hängt deshalb an keinen AK-IDs; ab P01 hängt jedes Playbook der Reihe an den
AK-IDs seines Moduls. Keine Schemaänderung: Service Builder kommt erst mit P02 (`service.xml` mit `Person` und
`Setting`).

## 2. Voraussetzungen

- Keine fertigen Playbooks der Reihe. P00 blockiert P01 bis P10 (`playbooks/00-steuerung.md`, Abschnitt 2).
- Werkzeuge der Sitzung: PostgreSQL 16 (vorinstalliert), Node.js und Playwright-Chromium des Repositorys, Java 21
  (vorinstalliert, passt zu keiner Liferay-Version und bleibt für den Rest der Sitzung). Container starten in der
  Cloud-Sitzung nicht (`CLAUDE.md`); alles läuft nativ.
- Netz: SourceForge, Maven Central und das Ubuntu-Archiv sind erreichbar; Liferay-CDN, Liferay-Nexus, Adoptium und Azul
  nicht (`profile/liferay-gemeinsam.md` 4.6). Maven Central kann mit 429 ablehnen: Abrufe bündeln, mit Pause wiederholen.
- Profil 6.2.5, Abschnitte 1, 2, 4, 5, 7 und „In P00 zu bestätigen“; gemeinsames Profil: 2.2, 2.6, 3.2, 4, 5, 7.
- Ein Branch, z. B. `claude/l62-p00-grundgeruest`, und ein Draft-PR (`CLAUDE.md`, „Arbeitsweise“).
- Änderungen an `.claude/hooks/session-start.sh` und `.github/workflows/ci.yml` sind Klasse I und geschützte Pfade: der
  Auftrag muss sie nennen, Chris gibt frei.

## 3. Eingaben

- Profil: `profile/liferay-625.md` (alle Abschnitte), `profile/liferay-gemeinsam.md` 2.2 (Datum und Zeit), 2.6 (Skript
  „Schutz in der Datenhaltung“), 3.2 (Uhr, Prüf-Adapter), 4.1 (Bundles), 4.2 (JDKs), 4.3 (Maven, SDK), 4.5 (Datenbank),
  5 (sicherheitsrelevante Dateien), 7 (Bibliotheken).
- Fach-Specs: `specs/00-uebersicht.md`, `specs/Q-plattform-und-qualitaet.md`, Abschnitt 8 („Prüfbarkeit“).
- Prüffälle: `specs/pruefung/format.md` („Regeln für Adapter“, „Abweichend, begründet“), `specs/pruefung/testdaten.json`.
- Vorgaben: `CLAUDE.md`, `docs/ci-richtlinie.md` (Klassentabelle, „Prüfungen je Teil“), `docs/06-spec-architektur.md`
  („Risiken“: Speicher und Laufzeit).
- Vorhandene Werkzeuge (nicht ändern): `scripts/pruefumfang/pruefumfang.mjs` (kennt L62 schon), `scripts/playbooks/pruefen.ts`.
- Muster für die Runner (lesen, nicht ändern): `tests/pruefung/cases.ts`, `e2e/pruefung-ablauf.spec.ts`,
  `e2e/pruefung/ablauf-adapter.ts`, `src/app/api/test/zustand/route.ts`.

## 4. Weg A: aus dem Quellcode

Es gibt keinen Liferay-Quellcode als Referenz. Weg A heißt hier nur: die Gegenstücke der TypeScript-App lesen, um
Aufbau und Verhalten der Runner zu übernehmen (`tests/pruefung/cases.ts` für Lader und Bau-Stand,
`e2e/pruefung-ablauf.spec.ts` und `e2e/pruefung/ablauf-adapter.ts` für den Ablauf-Runner, `src/app/api/test/zustand/route.ts`
für die Testschnittstelle). Konfiguration und Build entstehen aus dem Profil.

## 5. Weg B: aus der Spec

Bau-Reihenfolge des Gerüsts:

1. Laufzeit: JDK 8, Ant, Bundle, Plugins SDK, JDBC-Treiber (Profil 6.2.5, Abschnitte 1, 5.1; gemeinsam 4.1, 4.2, 4.5).
2. Projektbaum `liferay-625/` nach Profil 6.2.5, Abschnitt 2.1, SDK-Dateien eingerichtet, aber nicht eingecheckt.
3. Portal-Konfiguration aus `liferay-625/config/portal-ext.beispiel.properties` (Profil 6.2.5, Abschnitt 5.1, Schritt 4).
4. Plugin `bh-portlet` ohne Fachcode: Uhr-Service (gemeinsam 3.2), Testschnittstelle (Profil 6.2.5, Abschnitt 4.2), Paketwurzel
   `de.berichtsheft`, Prüfung „Fachlogik ohne Liferay-Import“.
5. Theme `bh-theme` mit Eltern-Theme `_styled`, noch ohne Gestaltung (P09).
6. Prüf-Runner der drei Ebenen mit Bau-Stand, Testdaten-Test.
7. Startskript, Messung, CI-Jobs der Klasse L62.

Für das Gerüst gibt es keine Akzeptanzkriterien. Die Regeln der Plattform (Uhr und Testdaten stellbar nur außerhalb des
Produktivbetriebs, feste Merker statt Meldungstexten) stehen in `specs/Q-plattform-und-qualitaet.md`, Abschnitt 8, und
werden in P10 abgenommen.

## 6. Empfehlung

**Weg B.** Das Gerüst ist Konfiguration und Werkzeug; das Profil legt es fest, und P00 bestätigt es am laufenden
System. Weicht das System vom Profil ab, gilt das System, und die Abweichung kommt als „abweichend, begründet“ unter
„Bitte bestätigen“, nie als Änderung am Profil.

### Aufbau der Reihe (gilt für P01 bis P10)

- Dateiname und Kurzname wie in `playbooks/typescript/` (`P05-status-und-pruefung.md` …); Kopfzeile mit Reihe, Plattform,
  Profil und Stand wie hier.
- Branch `claude/l62-pNN-<kurzname>`; Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`,
  Playwright aus der Wurzel des Repositorys.
- Abschnitt 5 hat je Modul eine AK-Tabelle mit **jeder** AK-ID einzeln (Kurzfassung, Zahl der Prüffälle je Ebene, Datei);
  ein Ablauf-Szenario aus `specs/pruefung/szenarien.json` steht getrennt (nicht in der Zahl der Prüffälle der AK-ID),
  Abweichungen als **abweichend, begründet** mit Prüffall-ID und Verweis auf das Profil.
- Fachlogik in `de.berichtsheft.domain.<bereich>` (Sprachstand Java 8, ohne Liferay-Import), Service in `*LocalServiceImpl`
  (prüft Rolle und Besitz selbst), Oberfläche in Portlets; „jetzt“ nur aus `ClockHolder`.
- Plattformeigene Tests heißen `AK505_<Beschreibung>Test` (AK-ID ohne Bindestrich), Prüffall-Tests tragen die ID unverändert
  (`AK-505-01`); Berichte nennen die AK-ID mit Bindestrich (Profil 6.2.5, Abschnitt 4).
- Jede Prüfung, die ein Playbook baut, bekommt eine **wirksame Gegenprobe**: ein benannter, absichtlich eingebauter Fehler
  und die benannten Fälle bzw. Tests, die er rot macht; danach zurücknehmen. Nummern `G<Paket>-n` (`G5-4` ist die vierte
  Gegenprobe von P05). CHECK-Constraints heißen wie im gemeinsamen Profil, Abschnitt 2.3, in beiden Reihen gleich.
- Abschnitt 8 nennt mindestens: Fachlogik-Adapter des Moduls, Daten-Adapter des Moduls, plattformeigene Tests,
  Ablauf-Fälle in Chromium und 375 px, den Ant-Lauf und die Playbook-Prüfung.

## 7. Schritte

1. **Bestand prüfen.** `git status`, `ls liferay-625` (fehlt erwartungsgemäß), `java -version` (21), `psql --version`
   (16). Prüfschritt: Ausgangslage im PR notiert.
2. **JDK 8 und Ant** (gemeinsam 4.2, Profil 6.2.5, Abschnitt 5.1 Schritt 1). `apt-get install -y openjdk-8-jdk-headless ant` (Paket
   `openjdk-8-jdk-headless` aus `noble-security`/`universe`, vorher `apt-get update`). `JAVA_HOME` nur für die
   Liferay-Befehle auf Java 8 (`export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64` in einer Hilfsdatei
   `liferay-625/env.sh`, die jeder Befehl mit `.` einliest), `JAVA_TOOL_OPTIONS` leer wie bei Keycloak in `CLAUDE.md`.
   Proxy und Zertifikate: Die Sitzung leitet HTTPS über einen Proxy mit eigener Zertifizierungsstelle; für Ivy und Java 8
   die Zertifikate der Sitzung in einen eigenen Truststore unter `$HOME/.bh-liferay/` übernehmen (`keytool -importcert`)
   und `-Djavax.net.ssl.trustStore` sowie `-Dhttps.proxyHost/-Dhttps.proxyPort` aus `HTTPS_PROXY` in `ANT_OPTS` setzen.
   Prüfschritt: `java -version` zeigt 1.8 nur mit `env.sh`; `ant -version` zeigt 1.10.x; ein Abruf von Maven Central über
   Ant (`<get>`) gelingt.
3. **Bundle und Plugins SDK** (gemeinsam 4.1). Beide Archive von SourceForge mit `curl -L --retry 4` nach
   `$HOME/.bh-liferay/download/` laden (Bundle 300.963.516 Byte, SDK 3.676.136 Byte; Größe prüfen), das Bundle nach
   `$HOME/.bh-liferay/bundle/` entpacken. JDBC-Treiber 42.7.14 von Maven Central nach `tomcat-7.0.62/lib/ext/`, den
   mitgelieferten PostgreSQL-Treiber entfernen (gemeinsam 4.5, Profil 6.2.5, Abschnitt 5.1 Schritt 2). Das SDK wird über `liferay-625/`
   entpackt, ohne vorhandene Dateien zu überschreiben; seine eigenen Dateien (`build-common*.xml`, `lib/`, `tools/`,
   `portlets/build.xml` usw.) schließt `liferay-625/.gitignore` aus. Eingecheckt sind nur die Dateien aus Profil 6.2.5, Abschnitt 2.1.
   `build.<benutzer>.properties` aus `liferay-625/build.beispiel.properties` erzeugen (`app.server.parent.dir` auf das
   Bundle). Prüfschritt: `git status` zeigt keine SDK-Datei; Tomcat-Version im Bundle notiert (erwartet 7.0.62).
4. **Startskript** (Klasse I, `.claude/hooks/session-start.sh`). Ein eigener Abschnitt richtet Schritt 2 und 3 nur ein,
   wenn die Sitzung ihn verlangt (Umgebungsvariable `BH_PLATTFORM=liferay-625`), damit TypeScript-Sitzungen nicht
   langsamer werden; die Archive bleiben unter `$HOME/.bh-liferay/` zwischengespeichert, ein zweiter Lauf lädt nichts.
   Er legt die Datenbanken `berichtsheft_l625` und `berichtsheft_l625_test` für die Rolle `berichtsheft` an (Profil 6.2.5, Abschnitt 5.1
   Schritt 3) und schreibt sein Protokoll nach `/tmp/session-start.log`. Prüfschritt: zwei Läufe hintereinander, der
   zweite in unter einer Minute; ohne `BH_PLATTFORM` ändert sich am bisherigen Ablauf nichts.
5. **Portal-Konfiguration.** `liferay-625/config/portal-ext.beispiel.properties` mit allen Schlüsseln aus Profil 6.2.5, Abschnitt 5.1
   Schritt 4 (Datenbank, `setup.wizard.enabled=false`, `bh.betrieb`, `bh.teams.modus`, Anmeldung, Sitzung, persönliche
   Seiten aus, SMTP Port 1025, Absender der E-Mail (`admin.email.from.address`, `admin.email.from.name`), `bh.app.url`
   (Basis der Links in Nachrichten, `http://localhost:8080`), `index.on.startup=false`); Passwörter nur als Platzhalter. Das Startskript erzeugt daraus
   `portal-ext.properties` im Bundle mit `bh.betrieb=test`. Prüfschritt: `grep -c '<platzhalter>'` in der Vorlage > 0,
   keine echten Zugangsdaten im Repository.
6. **Erster Start ohne Plugin** (Profil 6.2.5, „In P00 zu bestätigen“ 1, 2, 11). `tomcat-7.0.62/bin/catalina.sh run` mit
   `setenv.sh` des Bundles (`-Duser.timezone=GMT`, Heap 2 GB als Ausgangswert, `-XX:MaxPermSize` ist unter Java 8
   wirkungslos). Prüfschritt: Log meldet „Server startup in … ms“; Portal-Tabellen liegen in `berichtsheft_l625`;
   `SHOW TimeZone` über die JDBC-Sitzung des Portals ergibt UTC, auch nach einem zweiten Start mit `TZ=Europe/Berlin`
   (gemeinsam 2.2).
7. **Plugin `bh-portlet` ohne Fachcode.** `ant create` des SDK nicht nötig; Gerüst nach Profil 6.2.5, Abschnitt 2.1 von Hand:
   `portlet.xml` mit einem Platzhalter-Portlet, `liferay-portlet.xml`, `liferay-plugin-package.properties`,
   `liferay-hook.xml` (noch leer bis P02), `web.xml` mit dem Servlet der Testschnittstelle. Paketwurzel `de.berichtsheft`
   (Profil 6.2.5, Abschnitt 2.1, „Bitte bestätigen“). `javac.source` und `javac.target` auf `1.8` (Profil 6.2.5, Abschnitt 1). Ant-Ziele `test-unit`,
   `test-db`, `pruefung-fachlogik`, `pruefung-daten`, `test-integration` in der `build.xml` des Plugins mit der Ant-Aufgabe
   `junit` (Profil 6.2.5, Abschnitt 2.2); jedes Ziel nimmt `-Dbh.pruefung.filter=<Datei oder ID-Präfix>` (Gegenstück zu `-t "M05.json"`)
   und `-Dtest.class=<Klasse>`. Prüfschritt: `ant compile` und `ant war`; der Name des WAR ist notiert.
8. **Abhängigkeiten** (gemeinsam 7, Profil 6.2.5, Abschnitt 4.1). `ivy.xml` mit zwei Konfigurationen: `default` (PDFBox erst in P07,
   JDBC nur im Bundle) und `test` (JUnit 4.13.2, Jackson Databind 2.12.7.2). `ivy-settings.xml` nur mit Maven Central.
   **Jackson nur in Tests:** Jackson steht ausschließlich in der Konfiguration `test`; die Version 2.12.x bleibt auch bei
   Java 8, damit die Ausweichregel Java 7 keine zweite Version braucht (gemeinsam 7). P00 prüft, dass 2.12.7.2 die letzte
   2.12.x auf Maven Central ist. Prüfschritt: `unzip -l` des WAR enthält kein `jackson-*.jar` und kein `junit-*.jar`
   (Gegenprobe: Jackson testweise in `default` eintragen, die Prüfung meldet den Fund; zurücknehmen).
9. **Uhr-Service** (gemeinsam 3.2, Gegenstück zu `src/domain/clock.ts`). `de.berichtsheft.clock.Clock` mit `now()`, die
   Umsetzungen `SystemClock` und `FixedClock`, `ClockHolder` als einziges Einzelstück des Plugins. `bh.betrieb` aus
   `PropsUtil.get("bh.betrieb")`, Voreinstellung `produktion`; bei `produktion` wirkt eine Vorgabe der Uhr nicht
   (M01-R03). Keine Klasse unter `de.berichtsheft.domain` liest die Systemzeit. Prüfschritt: Unit-Test „Uhr in Produktion
   nicht stellbar“ und ein Test `DomainOhneLiferayTest`, der alle Quellen unter `domain/` auf `import com.liferay.` und
   `new Date()`/`System.currentTimeMillis()` durchsucht (Gegenprobe: ein Import in einer Testquelle macht ihn rot).
10. **Testschnittstelle** (Profil 6.2.5, Abschnitt 4.2). Servlet `de.berichtsheft.pruefung.ZustandServlet` unter
    `/bh-portlet/pruefung/zustand`, fest in `web.xml`, prüft `bh.betrieb=test` bei **jeder** Anfrage, sonst 404.
    Aktionen in P00: `uhr_stellen`, `uhr_zuruecksetzen`, `bestand_leeren` (noch leer), `testdaten_laden` (liest nur,
    legt bis P02 nichts an). Antwort als JSON mit festen Fehlercodes (`{ "fehler": "<code>" }`), nie mit Meldungstext.
    Prüfschritt: `curl -s -o /dev/null -w "%{http_code}"` liefert 200 mit `bh.betrieb=test` und 404 nach Umstellen auf
    `produktion` und Neustart; dazu ein Versuch, das Servlet per `ServletContext.addServlet` anzumelden, als Beleg für
    Profil 6.2.5, „In P00 zu bestätigen“ Punkt 19 (Ergebnis notieren, Versuch zurücknehmen).
11. **Prüf-Runner.** Lader `de.berichtsheft.pruefung.Prueffaelle` (Jackson, nur Testklassenpfad) liest alle Dateien
    `specs/pruefung/*.json` außer `testdaten.json` aus `bh.pruefung.dir` (Voreinstellung: Wurzel des Repositorys) und
    verteilt nach Ebene: `fachlogik` an `PruefungFachlogikTest`, `daten` an `PruefungDatenTest`, `ablauf` an den
    Ablauf-Runner. Jeder Fall ist ein Test mit dem Namen `<Prüffall-ID> (<Datei>, <Ebene>)` (`@Parameters(name = "{0}")`).
    **Bau-Stand:** `BauStand.java` mit der Liste der gebauten Module (anfangs leer) und der zurückgestellten Fälle
    (AK-305-09 bis P04, AK-408-07 bis P06, AK-205-01 und AK-205-02 bis P08; die TypeScript-Reihe baut AK-408-07 schon in P04). Ein ungebauter oder
    zurückgestellter Fall endet mit `Assume` und der Meldung „<ID> noch nicht gebaut“; ein Fall mit
    `abweichend.liferay-625` mit „<ID> abweichend, begründet: <Verweis>“ (Profil 6.2.5, Abschnitt 4.1). Der Runner schreibt am Ende eine
    Zusammenfassung „grün / rot / noch nicht gebaut / abweichend“ ins Ant-Log; ein Fall ohne Markierung, den kein Adapter
    ausführen kann, ist rot. Jedes Playbook P01 bis P09 trägt am Ende sein Modul ein; P10 löscht beide Listen.
    Prüfschritt: `ant pruefung-fachlogik` zeigt alle Fälle als „noch nicht gebaut“, keinen roten; ein absichtlich
    eingetragenes Modul ohne Adapter macht dessen Fälle rot (Gegenprobe, danach zurücknehmen).
12. **Ablauf-Runner und Testdaten.** `liferay-625/e2e/playwright.config.ts` (Projekte `chromium`, `smartphone-375`, in CI
    zusätzlich `firefox`, `msedge`, `a11y`), `liferay-625/e2e/pruefung-ablauf.spec.ts` und `liferay-625/e2e/seiten.ts`
    (Adresstabelle nach Profil 6.2.5, Abschnitt 4.3, Seiten und Merker: `anmelden`, `kein_zugang`, `start`, `wochen`, `bericht`, `pruefliste`,
    `azubis`, `personen`, `nicht_zustellbar`, `benachrichtigungen`, `einstellungen` und `entwickler-postfach` (Teams-Postfach der
    Demo, Azubis eigene, Ausbilder alle), alle unter `/web/berichtsheft/<Seite>`, `bericht` über `friendly-url-routes.xml`); der Ablauf übernimmt Prüfungen und Fallverteilung aus
    `e2e/pruefung-ablauf.spec.ts` und `e2e/pruefung/ablauf-adapter.ts`, ohne diese Dateien zu ändern (ob eine gemeinsame
    Adresstabelle für beide Plattformen möglich ist, kommt unter „Bitte bestätigen“, Profil 6.2.5, Abschnitt 4.3). Testdaten-Test
    `TestdatenTest` in `test/unit/`: fünf Personen mit eindeutigem Schlüssel, Rolle, E-Mail und Konto, Anna, Bernd und
    Clara `angelegt`, Dora und Emil nicht; kein Feld `id`. Prüfschritt:
    `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --list` findet die Ablauf-Fälle und
    meldet sie beim Lauf als übersprungen („noch nicht gebaut“), nicht „keine Tests gefunden“; `ant test-unit` grün.
13. **Messung von Speicher und Laufzeit** (Profil 6.2.5, Abschnitt 7 „Größe“, `docs/06-spec-architektur.md` „Risiken“). Jede Messung
    dreimal, Mittelwert und Höchstwert; Umgebung dazu notieren (`nproc`, `free -m`, `df -h $HOME`). Werkzeug für die
    Zeit `/usr/bin/time -v` (Laufzeit, „Maximum resident set size“), für den laufenden Tomcat `ps -o rss=,vsz= -p <pid>`
    und `jcmd <pid> GC.heap_info`.

    | Messgröße | Befehl bzw. Messpunkt | Ergebnis im PR |
    | --- | --- | --- |
    | Bundle-Start kalt (leere Datenbank) | Start `catalina.sh run` bis „Server startup in … ms“ im Log | Sekunden, RSS des Tomcat-Prozesses danach |
    | Bundle-Start warm (Datenbank vorhanden) | wie oben, zweiter Start | Sekunden, RSS |
    | Deployment | `ant deploy` bis „1 portlet for bh-portlet is available for use“ | Sekunden, RSS des Tomcat danach |
    | Build | `ant clean compile war` im Plugin; `ant deploy` im Theme bis zur Meldung im Log (Sass-Übersetzung) | Sekunden, Höchst-RSS von Ant |
    | Testlauf ohne Portal | `ant test-unit pruefung-fachlogik test-db` | Sekunden, Höchst-RSS |
    | Testlauf mit Portal | `ant pruefung-daten` und Playwright `--project=chromium --project=smartphone-375` | Sekunden, RSS von Tomcat, PostgreSQL und Browser zusammen |
    | Plattenbedarf | `du -sh $HOME/.bh-liferay` und Größe von `berichtsheft_l625` (`pg_database_size`) | MB |

    Dieselben Werte im CI-Lauf auf dem Standard-Runner (Schritt 14) als Schritt-Zusammenfassung ausgeben. Prüfschritt:
    Tabelle im PR vollständig; reicht der Heap von 2 GB nicht oder überschreitet die Summe den Speicher des Runners, ist
    das ein Befund für die Steuerung (Ausweichen: kleinerer Heap, Browser nacheinander, eigenes Image).
14. **CI-Klasse L62** (`docs/ci-richtlinie.md`, Klassentabelle und „Prüfungen je Teil“, CI-25, CI-32). Die Zuordnung
    `liferay-625/**` → L62 steht schon in `scripts/pruefumfang/pruefumfang.mjs` (Feld `liferay625` des Jobs „Umfang“).
    In `.github/workflows/ci.yml` (Klasse I, Freigabe Chris) zwei Jobs, beide nur, wenn „Umfang“ `liferay625` meldet:
    - **schnell** (jeder Lauf des PRs): JDK 8 und Ant, Bundle, SDK und Ivy-Zwischenspeicher aus dem Actions-Cache,
      `ant compile war test-unit pruefung-fachlogik test-db` mit PostgreSQL als Dienst-Container;
    - **voll** (bereiter PR, Wochenlauf, Label `volle-pruefung`): Portal starten (natives Bundle wie in der Sitzung oder
      Docker Hub `liferay/portal:6.2.5-ga6`, Profil 6.2.5, „In P00 zu bestätigen“ Punkt 21), `ant deploy`, `ant pruefung-daten test-integration`, dann
      Playwright mit `chromium` und `smartphone-375`, Mailpit als Dienst-Container.

    Beide Jobs gehen in „Prüfung abgeschlossen“ ein (CI-36). Öffentliches Repository: nur Testdaten, keine Geheimnisse,
    Logs des Portals ohne Personendaten. Firefox und Edge für Liferay regelt P10 (siehe „Bitte bestätigen“). Prüfschritt:
    `npm run pruefumfang -- --auswahl liferay-625/portlets/bh-portlet/build.xml` meldet L62; ein Draft-Lauf zeigt den
    schnellen Job grün, die Zeile „Liferay 6.2.5“ in „Prüfungen je Teil“ ist damit festgelegt (Eintrag in
    `docs/ci-richtlinie.md` übernimmt die Steuerung).
15. **Profil bestätigen.** Zu jedem Punkt aus „In P00 zu bestätigen“ (Profil 6.2.5, Punkte 1 bis 22) ein Eintrag mit Beleg (Befehl,
    Logzeile, Versuch). Was P00 noch nicht zeigen kann, bekommt das Playbook, in dem es entsteht: Service Builder,
    `build.auto.upgrade`, Upgrade-Reihenfolge und `ModelListener` (Punkte 4 bis 6) → P02 bzw. P06; Transaktion, Custom
    SQL und Cache (9, 10) → P05; Scheduler und Mail (12, 13) → P08; Glocke, Sass, Theme (14, 17, 18) → P09; Login und
    JSP-Hook (15, 16) → P02. Hook-Teile im selben Plugin (7) und Service Builder ohne Java-8-Syntax (8) belegt P00 mit
    einem Probe-Hook bzw. einer Probe-Entity auf einem Wegwerf-Branch. Prüfschritt: Liste vollständig im PR;
    `npx tsx scripts/playbooks/pruefen.ts` meldet keine Befunde.

## 8. Prüfung

Alle Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`.

| Befehl | Erwartet |
| --- | --- |
| `ant compile war` | Build ohne Fehler; WAR ohne Jackson und JUnit |
| `ant deploy` (Portal läuft) | „1 portlet for bh-portlet is available for use“ im Tomcat-Log |
| `ant test-unit` | Testdaten-Test, Uhr-Test und `DomainOhneLiferayTest` grün |
| `ant pruefung-fachlogik` | alle Fälle „noch nicht gebaut“ bzw. „abweichend, begründet“, keiner rot |
| `ant test-db` | startet gegen `berichtsheft_l625_test`, noch ohne Tests, ohne Fehler |
| `ant pruefung-daten` (Portal mit `bh.betrieb=test`) | alle Daten-Fälle „noch nicht gebaut“, Testschnittstelle erreichbar |
| `curl -s -o /dev/null -w "%{http_code}" localhost:8080/bh-portlet/pruefung/zustand` | 200 bei `bh.betrieb=test`, 404 bei `produktion` |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375` (im Wurzelordner) | Ablauf-Fälle gefunden, als „noch nicht gebaut“ übersprungen |
| `npm run pruefumfang -- --auswahl liferay-625/portlets/bh-portlet/build.xml` | Klasse L62 |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job mit Docker-Image oder nativem Bundle, Mailpit, Firefox und Edge; im PR vermerken.

## 9. Abschluss

- Commit mit deutscher Beschreibung, z. B. „L62 P00: Grundgerüst (Bundle, Plugin, Prüf-Runner, Messung)“; Startskript und
  Workflow in einem eigenen Commit (Klasse I). Vor dem Push alle Befehle aus Abschnitt 8 lokal grün.
- Draft-PR mit: Messtabelle (Schritt 13), Liste „In P00 zu bestätigen“ mit Ergebnis (Schritt 15), Bau-Stand (leer),
  Hinweis, dass der volle Job, Firefox und Edge nur in CI laufen, und „Bitte bestätigen“. Änderungsklassen L62 und I;
  `.claude/**` und `.github/**` sind geschützt, Chris mergt.
- Bericht an die Steuerung per `send_message`: Stand, Messwerte, Befehle und Ergebnisse, offene Punkte. `FORTSCHRITT.md`
  schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Ant oder Ivy scheitert mit `PKIX path building failed` | Zertifikate der Sitzung in den Truststore von Java 8 übernehmen (Schritt 2); nie TLS-Prüfung abschalten |
| Ivy sucht im Liferay-Nexus (Proxy 403) | `ivy-settings.xml` nur mit Maven Central; Auflösung der SDK-eigenen Ziele prüfen (gemeinsam 4.3) |
| Maven Central antwortet 429 | Abrufe bündeln, Pause, höchstens vier Wiederholungen; Ivy-Zwischenspeicher behalten |
| Portal startet nicht auf PostgreSQL 16 (`authentication method 10 not supported`) | alter Treiber noch in `lib/ext/`; nur 42.7.14 behalten (gemeinsam 4.5) |
| Zeiten um eine oder zwei Stunden verschoben | JVM nicht in GMT oder JDBC-Sitzung nicht in UTC; `setenv.sh` und Zeitzonen-Nachweis (Schritt 6) |
| `ant deploy` fertig, Tests scheitern sofort | Hot Deploy ist asynchron; auf die Meldung im Log bzw. eine Antwort der Testschnittstelle warten (Profil 6.2.5, Abschnitt 7) |
| SDK-Dateien tauchen in `git status` auf | `liferay-625/.gitignore` ergänzen; nichts vom SDK einchecken |
| Jackson im WAR | Abhängigkeit in die Ivy-Konfiguration `test` verschieben (Schritt 8) |
| Runner zeigt „0 Tests“ | `bh.pruefung.dir` zeigt nicht auf die Wurzel des Repositorys |
| Testschnittstelle in Produktion erreichbar | Prüfung von `bh.betrieb` nur beim Start statt je Anfrage (Schritt 10) |
| Startskript macht TypeScript-Sitzungen langsam | Liferay-Teil nur mit `BH_PLATTFORM=liferay-625` (Schritt 4) |

## Bitte bestätigen

- [ ] SDK-Dateien werden beim Einrichten über `liferay-625/` entpackt und per `.gitignore` ausgeschlossen; Profil 6.2.5, Abschnitt 2.1
      nennt `liferay-625/` die Wurzel des SDK, Profil 6.2.5, Abschnitt 5.1 entpackt das SDK außerhalb des Repositorys (abweichend,
      begründet: Die Ant-Dateien eines Plugins importieren die SDK-Dateien relativ).
- [ ] Liferay-Teil des Startskripts nur mit `BH_PLATTFORM=liferay-625`, Zwischenspeicher unter `$HOME/.bh-liferay/`.
- [ ] Jackson Databind 2.12.7.2 nach `profile/liferay-gemeinsam.md` 7; Profil 6.2.5, 4.1 nennt noch „ab 2.13 Java 8,
      Version in P00“ (widerspricht dem gemeinsamen Profil, das maßgeblich bleibt).
- [ ] Ant-Schalter `-Dbh.pruefung.filter` und `-Dtest.class` als Gegenstück zu `-t` in Vitest.
- [ ] Firefox und Edge für den vollen Liferay-6.2.5-Job: `docs/ci-richtlinie.md` nennt für Liferay nur Chromium, AK-1101
      verlangt alle drei Browser (Klärung in P10).
