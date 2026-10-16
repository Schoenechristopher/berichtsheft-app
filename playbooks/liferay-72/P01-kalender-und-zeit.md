# P01 Kalender und Zeit (M01)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket K) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Uhr, die ISO-Wochen, die Zeitzone Europe/Berlin, die Bundesländer und die Feiertage von M01 sind als reine Java-Klassen in
`bh-domain` umgesetzt (Java 8, `java.time`, keine Liferay-Abhängigkeit); die Uhr läuft im Portal als OSGi-Service `ClockImpl`
aus P00 und folgt der Regel „nur bei `bh.betrieb=test` stellbar“. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M01.json` über den Fachlogik-Adapter grün sind (7 AK-IDs; 50 Prüffälle der Ebene
   `fachlogik`, keine Daten-, Ablauf- oder Szenario-Fälle);
2. die plattformeigenen Tests grün sind: `ClockImplTest.AK1201_produktionVerwirftDieVorgabe`,
   `ClockServiceTest.AK1201_gestellteUhrWirktImLaufendenPortal` und `CalendarZoneTest.AK1202_ergebnisUnabhaengigVonDerJvmZeitzone`;
3. der Abgleich der Feiertage mit der Referenz (Schritt 8) für alle 16 Bundesländer und die Jahre 2015 bis 2035 ohne Unterschied
   endet oder jeder Unterschied unter „Bitte bestätigen“ steht;
4. jede Gegenprobe aus Schritt 10 die dort benannten Prüffälle bzw. Tests rot gemacht hat und zurückgenommen ist.

P01 baut keine Seite, keine Entity und keine Tabelle; es gibt keine Schemaänderung. Es gibt keine Abweichung gegenüber der
TypeScript-App („gleichwertig“ für alle sieben AK-IDs).

## 2. Voraussetzungen

- L72-P00 abgenommen und gemergt (Gerüst mit `bh-domain`, `bh-clock`, Fachlogik-Adapter mit Bau-Stand, Testschnittstelle,
  Systemzeit-Prüfung im Build). M01 hängt von keinem Modul ab, wird aber **vor** P02 gebaut: P01 und P02 ändern beide den
  Fachlogik-Adapter und den Bau-Stand, und P02 braucht die Bundesland-Referenzdaten (`FederalStates`) und die Uhr.
- Profil 7.2: Abschnitt 1 (Java 11 zur Laufzeit, Java 8 als Quellstand der Fachlogik), 3.2 (Uhr als OSGi-Service), 4
  (Fachlogik-Adapter, Gegenprobe) und 7 (Zeitzone); gemeinsam 2.2 (Datum und Zeit), 3.2 (Uhr-Service, Fachlogik als reine Java-Klassen)
  und 7 (Feiertage ohne Bibliothek).
- JDK 11 und die JVM-Einstellung `-Duser.timezone=GMT` aus P00: Die Fachlogik darf sich darauf **nicht** verlassen (Schritt 4).

## 3. Eingaben

- Fach-Spec: `specs/M01-kalender-und-zeit.md` (Regeln M01-R01 bis M01-R19, Abschnitt 5 Referenzdaten der einmaligen Feiertage,
  Abschnitt 6 Schnittstellen, Abschnitt 8 Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M01.json`; Format und Schnittstellen von M01: `specs/pruefung/format.md`, „Schnittstellen von M01“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M01 Kalender und Zeit“ (Spalte „Plattformgebunden“, „Fallen“).
- Gegenstück der Referenz-Umsetzung: `playbooks/typescript/P01-kalender-und-zeit.md` (nur zum Abgleich).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und bei vorhandenem Quellcode. `src/domain/clock.ts`, `src/domain/weeks.ts`,
`src/domain/federal-states.ts` und `src/domain/holidays.ts` lassen sich nach Java übersetzen; plattformgebunden sind nach der
Code-Landkarte nur `clockFromEnvironment()` (auf 7.2 `bh.betrieb`, Profil 3.2), `calendarDateIn()` (auf 7.2 `java.time` mit
`ZoneId.of("Europe/Berlin")`) und die Feiertagsbibliothek `feiertagejs` (auf 7.2 eigene Umsetzung ohne Bibliothek, gemeinsam 7).
Dasselbe Quellmaterial dient in Schritt 8 als Gegenstück für den Abgleich der Feiertage. Belege der Referenz:
`src/domain/clock.test.ts`, `src/domain/weeks.test.ts`, `src/domain/federal-states.test.ts`, `src/domain/holidays.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Uhr-Regeln, (2) Kalendertag und Zeitzone, (3) ISO-Wochen, (4) Bundesländer, (5) Feiertage, (6)
Uhr als OSGi-Service, (7) Adapter. Zu jedem AK die Prüffälle (alle in `specs/pruefung/M01.json`; Zählweise: Prüffälle **ohne**
Ablauf-Szenario, M01 hat keines):

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-404 | Gesetzliche Feiertage des eingestellten Bundeslands sind als „Feiertag“ vorbelegt; Beispiele 25.12.2026, Fronleichnam 2027 in NW ja, NI nein. Das Vorbelegen beim Anlegen regelt M03. | 3 (3 fachlogik) | gleichwertig; hier nur `Holidays.isHoliday()`, das Vorbelegen folgt in P03 |
| AK-1201 | „Jetzt“ aus einer zentralen Uhr, für Tests und Vorführungen stellbar, im Produktivbetrieb nicht. | 5 (5 fachlogik) | gleichwertig; `bh.betrieb` statt `NODE_ENV` (Profil 3.2); zusätzlich zwei plattformeigene Tests |
| AK-1202 | Maßgeblich ist der Kalendertag in Europe/Berlin, mit Sommer- und Winterzeit. | 9 (9 fachlogik) | gleichwertig; die JVM läuft in UTC (gemeinsam 2.2), die Zone steht deshalb immer ausdrücklich im Code |
| AK-1203 | ISO-8601-Kalenderwochen (Woche 1 enthält den 4. Januar). | 10 (10 fachlogik) | gleichwertig; Wochenjahr über `IsoFields.WEEK_BASED_YEAR` |
| AK-1204 | Eine Woche, die es nicht gibt, wird abgewiesen, z. B. KW 53/2027 oder KW 0. | 6 (6 fachlogik) | gleichwertig; `InvalidIsoWeekException` mit Fehlercode `woche_ungueltig` |
| AK-1205 | Genau die 16 Bundesländer mit festen Kürzeln; ein unbekanntes Kürzel wird abgewiesen. | 6 (6 fachlogik) | gleichwertig; `UnknownFederalStateException` mit Fehlercode `bundesland_unbekannt` |
| AK-1206 | Feiertag ist jeder landesweite gesetzliche Feiertag, einschließlich einmaliger; kommunale und regionale zählen nicht. | 11 (11 fachlogik) | gleichwertig; eigene Umsetzung ohne Bibliothek (gemeinsam 7), einmalige Feiertage aus den Referenzdaten der Spec |

Summe: 7 AK-IDs, 50 Prüffälle (50 fachlogik, 0 daten, 0 ablauf, 0 Szenario).

## 6. Empfehlung

**Weg B.** Die Regeln sind klein und vollständig in der Fach-Spec samt Referenzdaten beschrieben, und die 50 Prüffälle sind der
Maßstab. Die Feiertagsregeln je Bundesland stehen nicht als Tabelle in der Spec (sie verweist auf „das Feiertagsrecht des
jeweiligen Jahres“); deshalb prüft Schritt 8 die eigene Umsetzung zusätzlich gegen die Referenz-App. Weg A nur auf ausdrücklichen
Auftrag.

## 7. Schritte

1. **Branch** `claude/l72-p01-kalender-und-zeit`; Spec und Prüffälle lesen. Prüfschritt: Liste der Schnittstellen aus Abschnitt 6
   der Spec notiert (`jetzt`, `uhrVorgeben`, `kalendertag`, `isoWoche`, `montagDerWoche`, `arbeitstage`, `naechsteWoche`,
   `vergleicheWochen`, `aktuelleWoche`, `bundeslaender`, `istBundesland`, `istFeiertag`, `feiertage`) und die drei Fehlercodes
   (`zeitpunkt_ungueltig`, `woche_ungueltig`, `bundesland_unbekannt`).
2. **Uhr-Regeln** `de.berichtsheft.domain.clock` in `bh-domain` (M01-R01 bis M01-R04, AK-1201): zur Schnittstelle `Clock` aus P00
   kommen `SystemClock`, `FixedClock` und `ClockPolicy.fixedIfAllowed(String zeitpunkt, Betrieb betrieb)`. `Betrieb` ist `TEST`
   oder `PRODUKTION`; nur bei `TEST` liefert die Richtlinie die gestellte Uhr, bei `PRODUKTION` ignoriert sie die Vorgabe
   (M01-R03). Ein nicht lesbarer Text (`OffsetDateTime.parse` scheitert) wirft `InvalidInstantException`, Fehlercode
   `zeitpunkt_ungueltig` (M01-R04). `ClockImpl` in `bh-clock` ruft dieselbe Richtlinie auf, damit Fachlogik-Adapter und Portal
   dieselbe Regel nutzen. Prüfschritt: JUnit-Tests `AK1201_…` in `bh-domain`.
3. **Kalendertag** `de.berichtsheft.domain.calendar` (M01-R05, M01-R06, AK-1202): `Weeks.ZONE = ZoneId.of("Europe/Berlin")`,
   `Weeks.calendarDateIn(Instant)` und `Weeks.today(Clock)`; ein Kalendertag ist ein `java.time.LocalDate`. `CalendarDays`
   wandelt ihn streng in die Zeichenkette `JJJJ-MM-TT` und zurück (Spalten `VARCHAR(10)`, gemeinsam 2.2); ungültiger Text wirft
   `IllegalArgumentException`. Prüfschritt: JUnit-Tests `AK1202_…` mit Zeitpunkten um Mitternacht, in der Umstellung auf
   Sommer- und Winterzeit und zum Jahreswechsel.
4. **Zeitzone nie aus dem System lesen.** Nirgends `ZoneId.systemDefault()`, `LocalDate.now()`, `Instant.now()` oder
   `Calendar.getInstance()`; die JVM des Portals läuft in UTC (gemeinsam 2.2), die Tests der Fachlogik aber in der Zone der
   Entwicklungsmaschine. `CalendarZoneTest.AK1202_ergebnisUnabhaengigVonDerJvmZeitzone` setzt nacheinander `GMT`,
   `Europe/Berlin`, `Pacific/Auckland` und `America/Los_Angeles` als Standardzone (`TimeZone.setDefault`, danach
   zurückgestellt) und führt `calendarDateIn`, `isoWeekOf`, `arbeitstage` und `feiertage` mit festen Eingaben aus; das Ergebnis
   ist in allen vier Zonen gleich. Prüfschritt: Test grün; die Systemzeit-Prüfung im Build (P00, Schritt 13) bleibt grün.
5. **ISO-Wochen** (M01-R07 bis M01-R12, AK-1202, AK-1203, AK-1204): Wertklasse `IsoWeek` (Jahr, Nummer, Textform `JJJJ-Www`),
   `Weeks.isoWeekOf(LocalDate)` über `IsoFields.WEEK_BASED_YEAR` und `IsoFields.WEEK_OF_WEEK_BASED_YEAR`, `weeksInYear(int)` (53
   genau dann, wenn der 28. Dezember in KW 53 liegt), `isValid()`, `mondayOf()`, `workdays()` (fünf Tage Mo–Fr, auch über die
   Jahresgrenze), `next()`, `compare()` und `currentWeek(Instant)`. `InvalidIsoWeekException` (Fehlercode `woche_ungueltig`)
   für eine Woche, die es nicht gibt; sie wird nie still ins Nachbarjahr umgedeutet. Dazu die Texte für Oberfläche und PDF
   (`formatDate`, `weekLabel`, `weekRangeLabel`, `weekdayShort`, `weekCode` für den Merker `data-woche`). Prüfschritt: JUnit-Tests
   `AK1203_…` und `AK1204_…` (KW 1 enthält den 4. Januar; 2020 und 2026 mit 53 Wochen, 2027 ohne KW 53).
6. **Bundesländer** `de.berichtsheft.domain.federal` (M01-R13, M01-R14, M01-R18, AK-1205): `FederalStates` mit den 16 Kürzeln
   in der Reihenfolge der Spec (BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH), Namen, `isFederalState()` (nur
   Großbuchstaben, „nw“ ist unbekannt) und `UnknownFederalStateException` (Fehlercode `bundesland_unbekannt`). Prüfschritt:
   JUnit-Tests `AK1205_…`; derselbe Wertebereich steht im CHECK von `BH_Setting.federalState` (gemeinsam 2.3) und wird in P02
   gegen diese Klasse geprüft.
7. **Feiertage** `de.berichtsheft.domain.holidays` (M01-R15 bis M01-R19, AK-404, AK-1206): `Holidays.isHoliday(String bundesland,
   LocalDate)` und `Holidays.holidays(String bundesland, int jahr)` (Kalendertage aufsteigend, auch Sonn- und Samstage) ohne
   Bibliothek (gemeinsam 7): `EasterDate` (Osterformel nach Gauß), feste und bewegliche Feiertage und die Länderregeln als
   Tabelle im Code, die Korrektur des Reformationstags (2017 einmalig in allen Ländern; sonst in BB, MV, SN, ST und TH immer, in HB, HH, NI
   und SH seit 2018) und `OneTimeHolidays` nach den Referenzdaten aus Abschnitt 5 der Spec (08.05.2020, 08.05.2025 und 17.06.2028 in Berlin).
   Kommunale und regionale Feiertage (Augsburger Friedensfest, Fronleichnam in Teilen Sachsens und Thüringens) zählen nicht.
   Ein unbekanntes Bundesland wirft vor jeder Berechnung. Neue einmalige Feiertage kommen nur mit Rechtsquelle und Freigabe in
   die Liste (Spec, Abschnitt 10). Prüfschritt: JUnit-Tests `AK404_…` und `AK1206_…`, darunter Ostersonntag in BB.
8. **Abgleich mit der Referenz.** Ein Hilfsprogramm im Build-Verzeichnis (nicht committet) schreibt für alle 16 Bundesländer und
   die Jahre 2015 bis 2035 die Feiertage als `Bundesland Jahr Tag` je Zeile, einmal aus `Holidays.holidays()` und einmal aus
   `publicHolidays()` in `src/domain/holidays.ts` (Aufruf mit `npx tsx`). Die Datei-Unterschiede (`diff`) sind der Befund. Die
   Referenz ist kein Maßstab über der Spec: Ein Unterschied wird nicht still eingeebnet, sondern mit Rechtsquelle unter „Bitte
   bestätigen“ gemeldet; die Prüffälle AK-404-01 bis AK-404-03 und AK-1206-01 bis AK-1206-11 gelten in jedem Fall. Prüfschritt:
   `diff` ohne Ausgabe, oder jeder Unterschied im PR benannt.
9. **Uhr im Portal und Adapter.**
   - `ClockImpl` (P00) setzt die Richtlinie aus Schritt 2 ein; `ClockImplTest.AK1201_produktionVerwirftDieVorgabe` (JUnit in
     `bh-clock`, ohne OSGi, mit `produktion` aus `@Meta.AD(deflt = "produktion")`): `setFixed` wirft, eine vorher gesetzte
     Vorgabe ist verworfen, `now()` liefert die Systemzeit.
   - `ClockServiceTest.AK1201_gestellteUhrWirktImLaufendenPortal` (Arquillian, `bh-test-integration`, `bh.betrieb=test`): über
     die Testschnittstelle (`/o/bh-pruefung/zustand`) stellen, `Clock.now()` aus dem OSGi-Service liefert den gestellten
     Zeitpunkt, nach dem Zurückstellen wieder die Systemzeit.
   - **Fachlogik-Adapter:** die 13 Schnittstellen von M01; Formate Kalendertag `JJJJ-MM-TT`, Zeitpunkt mit Offset in Berliner
     Ortszeit, Woche `JJJJ-Www`; Fehler als `{ "fehler": "<Code>" }` über die Fehlerart, nie über den Meldungstext. `uhrVorgeben`
     bildet die Vorgabe über `ClockPolicy` nach (`betrieb`: `test` bzw. `produktiv`); die Uhr des Adapters wird nach jedem
     Fall zurückgestellt.
   Prüfschritt: `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M01` grün (50 Fälle).
10. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P01-1 „Kalenderjahr statt Wochenjahr“ (AK-1203) | `isoWeekOf()` liefert `date.getYear()` statt `IsoFields.WEEK_BASED_YEAR` | AK-1203-01, AK-1203-02, AK-1203-04 | AK-1203-03, AK-1202-06, AK-1202-07: Kalender- und Wochenjahr stimmen dort überein |
    | F-P01-2 „Systemzone statt Berlin“ (AK-1202) | `calendarDateIn()` rechnet mit `ZoneId.systemDefault()` (im Testlauf UTC) | AK-1202-01, AK-1202-04, AK-1202-05, AK-1202-07, AK-1202-08 und `CalendarZoneTest.AK1202_ergebnisUnabhaengigVonDerJvmZeitzone` | AK-1202-02, AK-1202-03, AK-1202-06: der UTC-Tag ist dort gleich dem Berliner Tag |
    | F-P01-3 „Woche 53 in jedem Jahr“ (AK-1204) | `weeksInYear()` liefert immer 53 | AK-1204-01, AK-1204-04, AK-1204-05, AK-1204-06 | AK-1204-02, AK-1204-03 (KW 0 und KW 54 bleiben außerhalb des Bereichs 1 bis 53); AK-1203-07 (2026 hat 53 Wochen) |
    | F-P01-4 „Uhr im Produktivbetrieb stellbar“ (AK-1201) | `ClockPolicy` ignoriert `betrieb` und stellt immer | AK-1201-04 und `ClockImplTest.AK1201_produktionVerwirftDieVorgabe` | AK-1201-03 (Betrieb `test`) |
    | F-P01-5 „Regionaler Feiertag zählt“ (AK-1206) | Fronleichnam gilt zusätzlich in SN | AK-1206-08 | AK-404-02, AK-404-03: NI und NW bleiben richtig |
    | F-P01-6 „Reformationstag 2017 vergessen“ (AK-1206) | Reformationstag in NI gilt erst ab 2018, der einmalige 31.10.2017 fehlt | AK-1206-09 | AK-1206-10, AK-1206-11 |
    | F-P01-7 „Systemzeit in der Fachlogik“ (AK-1201) | `Instant.now()` in `Weeks.currentWeek()` | die Systemzeit-Prüfung im Build aus P00 (meldet den Aufruf außerhalb von `ClockImpl`) | alle Prüffälle: sie übergeben „jetzt“ ausdrücklich |
    | F-P01-8 „Gestellte Uhr wirkt nicht im Portal“ (AK-1201) | `ClockImpl.setFixed()` speichert den Zeitpunkt nicht | `ClockServiceTest.AK1201_gestellteUhrWirktImLaufendenPortal` | alle Fachlogik-Fälle von AK-1201 (sie laufen über `ClockPolicy`, nicht über den Dienst) |

    Prüfschritt: acht rote Läufe mit den benannten Fällen im PR notiert, danach alles grün.
11. **Bau-Stand.** M01 in die Liste der gebauten Module eintragen (gemeinsame Liste beider Runner, P00 Schritt 12); die Fälle
    erscheinen nicht mehr als „noch nicht gebaut“. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M01` | 50 Fachlogik-Fälle grün, keiner „noch nicht gebaut“ |
| `./gradlew :modules:bh-domain:test` | JUnit-Tests `AK404_…`, `AK1201_…` bis `AK1206_…` und `CalendarZoneTest` grün; Systemzeit-Prüfung grün |
| `./gradlew :modules:bh-clock:test` | `ClockImplTest.AK1201_produktionVerwirftDieVorgabe` grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*ClockServiceTest*'` | grün (`bh.betrieb=test`) |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Playwright wird in P01 nicht gebraucht (keine Seite, keine Ablauf-Fälle).

## 9. Abschluss

- Commit, z. B. „L72-P01: Kalender und Zeit (Uhr, ISO-Wochen, Bundesländer, Feiertage)“; vor dem Push `./gradlew build` und der
  Fachlogik-Adapter von M01 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-404, AK-1201, AK-1202, AK-1203, AK-1204, AK-1205, AK-1206 mit Test und Prüffällen), dem
  Ergebnis des Abgleichs (Schritt 8), den Gegenproben mit den roten Fällen und „Bitte bestätigen“. Geschützte Pfade:
  `bh-clock` (stellbare Uhr, M01-R03) und `**/configuration/**` (Voreinstellung `produktion`) nach gemeinsam 5; Chris mergt.
- Bericht an die Steuerung per `send_message`: Stand, Befehle und Ergebnisse, offene Punkte. `FORTSCHRITT.md` schreibt die
  Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Tag um eins verschoben | Zone ausdrücklich `Europe/Berlin`, nie `systemDefault()`; `LocalDate` statt `Date` und `Calendar` (Schritt 4) |
| `Instant.now()` oder `LocalDate.now()` in Fachlogik | „jetzt“ nur aus `Clock` und als Parameter hineinreichen; die Systemzeit-Prüfung im Build meldet es |
| KW 53 wird für 2027 akzeptiert | `weeksInYear()`: 53 genau dann, wenn der 28. Dezember in KW 53 liegt |
| Jahr der Woche falsch am Jahreswechsel | Wochenjahr (`IsoFields.WEEK_BASED_YEAR`), nicht das Kalenderjahr des Datums |
| Feiertag fehlt oder zu viel (Reformationstag, einmalige Feiertage, Ostersonntag in BB) | Länderregeln und Referenzdaten aus Abschnitt 5 der Spec prüfen; nur landesweite Feiertage; Abgleich Schritt 8 |
| Uhr lässt sich im Portal in Produktion stellen | `ClockImpl` liest `bh.betrieb` in `@Activate` und `@Modified`; Voreinstellung `produktion`; Gegenprobe F-P01-4 |
| Gestellte Uhr bleibt nach einem Fall stehen | Uhr des Adapters nach jedem Fall zurückstellen; im Portal über die Testschnittstelle |
| Kalendertag als `java.util.Date` gespeichert | Spalten sind `VARCHAR(10)` mit `JJJJ-MM-TT` (gemeinsam 2.2), Umwandlung nur über `CalendarDays` |
