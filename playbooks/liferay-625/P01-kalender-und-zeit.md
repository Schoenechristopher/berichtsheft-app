# P01 Kalender und Zeit (M01)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket J) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Uhr, Kalendertag in Europe/Berlin, ISO-Wochen, die 16 Bundesländer und die Feiertage von M01 sind als reine Java-Klassen
unter `de.berichtsheft.domain.calendar` umgesetzt (Java 8, kein Import aus `com.liferay.*`), und die Uhr aus P00 ist um
das Lesen eines vorgegebenen Zeitpunkts ergänzt. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M01.json` grün sind (7 AK-IDs; 50 Fälle der Ebene `fachlogik`);
2. die eigenen Tests `AK1201_DomainLiestKeineSystemzeitTest` und `AK1202_UnabhaengigVonJvmZeitzoneTest` in `test/unit/`
   grün sind (Schritt 3; kein neutraler Fall zeigt, dass die Fachlogik von der Zeitzone der JVM unabhängig ist);
3. die **Gegenprobe** aus Schritt 9 durchgeführt ist: jeder benannte Fehler macht genau die benannten Prüffälle bzw.
   Tests rot und ist danach zurückgenommen;
4. M01 im Bau-Stand eingetragen ist und alle Prüffälle anderer Module weiterhin „noch nicht gebaut“ melden, keiner rot.

Schemaänderung: nein. M01 hält keine eigenen Bewegungsdaten (Fach-Spec M01, Abschnitt 5); Kalendertage werden erst ab
P02 und P03 als `VARCHAR(10)` gespeichert (gemeinsames Profil, Abschnitt 2.2). P01 baut keine Seite.

## 2. Voraussetzungen

- P00 der Reihe abgenommen: Gerüst, Uhr-Service (`Clock`, `SystemClock`, `FixedClock`, `ClockHolder`, `bh.betrieb`),
  Prüf-Runner mit Bau-Stand, Testschnittstelle, `DomainOhneLiferayTest`, Ant-Ziele.
- M01 hängt von keinem Modul ab und wird vor P02 gebaut: P02 braucht die Uhr, P03 die Wochenfunktionen und die Feiertage.
- Profil 6.2.5: Abschnitte 2.1 (Paketwurzel, `domain/`), 4.1 (Ebenen, Testnamen, Fehlercodes) und 7 („Service Builder
  liest Java-Quellen …“). Gemeinsames Profil: 2.2 (Datum und Zeit), 3.2 (Uhr-Service, Fachlogik als reine Java-Klassen,
  Ausweichregel Java 7) und 7 (Feiertage ohne Bibliothek).

## 3. Eingaben

- Fach-Spec: `specs/M01-kalender-und-zeit.md` (Regeln M01-R01 bis M01-R19, Abschnitt 5 Referenzdaten der einmaligen
  Feiertage, Abschnitt 6 Schnittstellen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 9 Auslegungen).
- Prüffälle: `specs/pruefung/M01.json`; Format und Fehlercodes: `specs/pruefung/format.md`, „Schnittstellen von M01
  (Fachlogik)“ und „Regeln für Adapter“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M01 Kalender und Zeit“ (Fallen: `getUTC…`, Uhr nur aus dem
  Uhr-Modul, Feiertage werden beim Anlegen vorbelegt und später nicht neu berechnet).
- Profil: `profile/liferay-625.md`, Abschnitte 2.1 und 4.1; `profile/liferay-gemeinsam.md`, Abschnitte 2.2, 3.2 und 7.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Es gibt keinen Liferay-Quellcode; Weg A heißt, die Gegenstücke der TypeScript-App zu
lesen: `src/domain/clock.ts` (`now()`, `setFixedNow()`, `clockFromEnvironment()`, `InvalidInstantError`),
`src/domain/weeks.ts` (`calendarDateIn()`, `isoWeekOf()`, `isoWeekMonday()`, `isoWeeksInYear()`, `isoWeekWorkdays()`,
`nextIsoWeek()`, `compareWeeks()`, `currentIsoWeek()`, `InvalidIsoWeekError`), `src/domain/federal-states.ts` und
`src/domain/holidays.ts` (`publicHolidays()`, `ONE_TIME_HOLIDAYS`). Übertragbar sind die Wochenfunktionen, die Liste der
Bundesländer und die Referenzdaten der einmaligen Feiertage 1:1. Nach Profil neu zu bauen sind `clockFromEnvironment()`
(`bh.betrieb` statt `NODE_ENV`), die Zeitzonenrechnung (`java.time` statt `Intl.DateTimeFormat`) und die Feiertage
(`feiertagejs` hat keine Entsprechung, gemeinsames Profil 7: eigene Berechnung). Belege zum Abgleich:
`src/domain/clock.test.ts`, `src/domain/weeks.test.ts`, `src/domain/federal-states.test.ts`,
`src/domain/holidays.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Uhr vervollständigen, (2) Kalendertag und Zeitzone, (3) ISO-Wochen, (4) Bundesländer, (5) Feiertage,
(6) Adapter für die Schnittstellen, (7) Gegenprobe. Zählweise der Prüffälle: alle Fälle der Prüffall-Datei je AK-ID;
M01 hat kein Ablauf-Szenario in `specs/pruefung/szenarien.json`. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-404 | Gesetzliche Feiertage des eingestellten Bundeslands sind als „Feiertag“ vorbelegt; Beispiele 25.12.2026, Fronleichnam 2027 in NW ja, NI nein. Das Vorbelegen beim Anlegen regelt M03 (P03). | 3 (3 fachlogik): AK-404-01, AK-404-02, AK-404-03 | `specs/pruefung/M01.json` |
| AK-1201 | „Jetzt“ aus einer zentralen Uhr, für Tests und Vorführungen stellbar, im Produktivbetrieb nicht. | 5 (5 fachlogik): AK-1201-01, AK-1201-02, AK-1201-03, AK-1201-04, AK-1201-05 | `specs/pruefung/M01.json` |
| AK-1202 | Maßgeblich ist der Kalendertag in Europe/Berlin, mit Sommer- und Winterzeit. | 9 (9 fachlogik): AK-1202-01 bis AK-1202-09 | `specs/pruefung/M01.json` |
| AK-1203 | ISO-8601-Kalenderwochen (Woche 1 enthält den 4. Januar). | 10 (10 fachlogik): AK-1203-01 bis AK-1203-10 | `specs/pruefung/M01.json` |
| AK-1204 | Eine Woche, die es nicht gibt, wird abgewiesen, z. B. KW 53/2027 oder KW 0. | 6 (6 fachlogik): AK-1204-01 bis AK-1204-06 | `specs/pruefung/M01.json` |
| AK-1205 | Genau die 16 Bundesländer mit festen Kürzeln; ein unbekanntes Kürzel wird abgewiesen. | 6 (6 fachlogik): AK-1205-01 bis AK-1205-06 | `specs/pruefung/M01.json` |
| AK-1206 | Feiertag ist jeder landesweite gesetzliche Feiertag, einschließlich einmaliger; kommunale und regionale zählen nicht. | 11 (11 fachlogik): AK-1206-01 bis AK-1206-11 | `specs/pruefung/M01.json` |

Summe: 7 AK-IDs, 50 Prüffälle (alle `fachlogik`), kein Szenario. Alle Fälle laufen über `PruefungFachlogikTest`; ein
Daten- oder Ablauf-Fall gehört nicht zu M01. Die Zeitzone der JVM zeigt nur der eigene Test aus Schritt 3.

## 6. Empfehlung

**Weg B.** Die Regeln sind klein, vollständig und mit Referenzdaten in der Fach-Spec beschrieben; die 50 Prüffälle sind
der Maßstab. Die einzige Stelle mit Spielraum sind die Feiertagsregeln der 16 Länder: Die Fach-Spec nennt Beispiele und
die einmaligen Feiertage, die Tabelle selbst entsteht aus dem Feiertagsrecht der Länder; für sie ist der Abgleich mit der
TypeScript-App (Schritt 6) Pflicht. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh` (Profil 2.2). Fachlogik liegt unter
`docroot/WEB-INF/src/de/berichtsheft/domain/calendar/`, Tests unter `test/unit/`.

1. **Branch** `claude/l62-p01-kalender-und-zeit`; Spec (M01-R01 bis M01-R19) und Prüffälle lesen. Prüfschritt: Liste der 13
   Schnittstellen aus Abschnitt 6 der Spec im PR-Entwurf (`jetzt`, `uhrVorgeben`, `kalendertag`, `isoWoche`,
   `montagDerWoche`, `arbeitstage`, `naechsteWoche`, `vergleicheWochen`, `aktuelleWoche`, `bundeslaender`, `istBundesland`,
   `istFeiertag`, `feiertage`).
2. **Uhr vervollständigen** (M01-R01 bis M01-R04, AK-1201; Gegenstück zu `src/domain/clock.ts`). `Clock`, `FixedClock`,
   `ClockHolder` und die Betriebsart `bh.betrieb` sind aus P00 da. Neu: `ClockSetup.fromConfiguration(vorgabe, betrieb)`
   (Gegenstück zu `clockFromEnvironment()`): bei `produktion` bleibt es bei der Systemzeit und die Vorgabe wirkt nicht
   (M01-R03), sonst liest sie `ISO-8601` mit Offset (`java.time.OffsetDateTime`) und stellt die Uhr; ein unlesbarer Wert wirft
   `InvalidInstantException` (Fehlercode `zeitpunkt_ungueltig`, M01-R04). „Jetzt“ ist ein `java.time.Instant` (legt P00
   die Uhr anders fest, gilt P00). Die Ausnahme ist eine Unterklasse von `RuntimeException` ohne Liferay-Bezug (die
   Fachlogik kennt `PortalException` nicht; der Service übersetzt dort, wo eine Transaktion zurückrollen muss, Profil 7
   „Zurückrollen“). Prüfschritt: `ant test-unit` mit Tests zu fester Uhr, Rückstellung, Produktion ignoriert die Vorgabe,
   unlesbarer Wert.
3. **Kalendertag und Zeitzone** (M01-R05, M01-R06, AK-1202). `CalendarDays` mit `APP_ZONE = ZoneId.of("Europe/Berlin")`,
   `calendarDateIn(Instant)` → `LocalDate` und `today(Clock)`. Ein Kalendertag ist in der Fachlogik ein `LocalDate`, in der
   Datenhaltung der Text `JJJJ-MM-TT` (gemeinsames Profil 2.2); umgewandelt wird nur an der Grenze (Persistenz, Adapter).
   Keine Klasse unter `domain/` liest die Systemzeit oder die Zeitzone der JVM: kein `LocalDate.now()`, `Instant.now()`,
   `ZoneId.systemDefault()`, `TimeZone.getDefault()`, `Calendar.getInstance()`. Zwei eigene Tests:
   `AK1201_DomainLiestKeineSystemzeitTest` durchsucht alle Quellen unter `domain/` nach diesen Aufrufen (erweitert
   `DomainOhneLiferayTest` aus P00 um die `java.time`-Aufrufe), `AK1202_UnabhaengigVonJvmZeitzoneTest` führt die
   Kalendertag- und Wochenfunktionen mit den Zeitpunkten aus AK-1202-01 bis AK-1202-08 nacheinander unter
   `TimeZone.setDefault` auf `GMT`, `Europe/Berlin`, `America/Los_Angeles` und `Pacific/Kiritimati` aus und verlangt
   überall dasselbe Ergebnis (danach Zeitzone zurücksetzen). Das Ant-Ziel `test-unit` startet die Test-JVM mit
   `-Duser.timezone=GMT` wie der Server (gemeinsames Profil 2.2); fehlt der Schalter, ergänzt ihn P01 in der `build.xml`
   des Plugins. Prüfschritt: beide Tests grün.
4. **ISO-Wochen** (M01-R07 bis M01-R12, AK-1202, AK-1203, AK-1204). `IsoWeek` (Jahr, Nummer; Textform `JJJJ-Www`,
   Merker `data-woche`) und `IsoWeeks`: `weekOf(LocalDate)`, `mondayOf(IsoWeek)`, `weeksInYear(int)` (53 genau dann, wenn
   der 28. Dezember in KW 53 liegt, M01-R08), `workdays(IsoWeek)` (fünf Tage Mo–Fr, auch über die Jahresgrenze,
   M01-R10), `next(IsoWeek)`, `compare(a, b)` (M01-R11), `current(Instant)` (M01-R09). `IsoWeek.of(jahr, nummer)` wirft
   `InvalidIsoWeekException` (`woche_ungueltig`) für Nummer unter 1 oder über der Wochenzahl des Jahres und rechnet nie
   still in ein Nachbarjahr um (M01-R12). Gerechnet wird nach ISO-8601 (`java.time.temporal.IsoFields`), nie mit
   `WeekFields.of(Locale…)`, dessen Ergebnis von der Locale der JVM abhängt. Prüfschritt: Unit-Tests mit KW 1 enthält den
   4. Januar, 2020 und 2026 mit 53 Wochen, 2027 ohne KW 53, Folgewoche über die Jahresgrenze.
5. **Bundesländer `FederalStates`** (M01-R13, M01-R14, M01-R18, AK-1205). Die 16 Kürzel in der Reihenfolge der Spec (BW,
   BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH) mit Namen, `isFederalState()`, `UnknownFederalStateException`
   (`bundesland_unbekannt`). Die Kürzel sind in Großbuchstaben fest: `nw` ist unbekannt (AK-1205-04), ebenso eine Stadt
   (AK-1205-06). Prüfschritt: Unit-Test.
6. **Feiertage `Holidays`** (M01-R15 bis M01-R19, AK-404, AK-1206; gemeinsames Profil 7: eigene Umsetzung ohne
   Bibliothek). Osterformel, feste und bewegliche Feiertage je Bundesland, nur landesweite gesetzliche (M01-R17): Fronleichnam
   in NW, aber nicht in NI und nicht in SN (AK-404-02, AK-1206-08), kein Augsburger Friedensfest (AK-1206-07). Dazu
   `ONE_TIME` mit den drei Einträgen aus Abschnitt 5 der Spec (BE 08.05.2020, 08.05.2025, 17.06.2028) und dem
   bundesweiten Reformationstag 2017; Reformationstag in NI erst ab 2018 (AK-1206-09, AK-1206-10, AK-1206-11). Mariä
   Himmelfahrt gilt in BY landesweit (Spec, Abschnitt 9). `isHoliday(bundesland, LocalDate)` und `holidays(bundesland,
   jahr)` (aufsteigend, auch Samstage und Sonntage, M01-R19) weisen ein unbekanntes Bundesland ab. Jede Regel trägt ihre
   Rechtsquelle als Kommentar. **Abgleich vor dem Eintragen:** mit einem Wegwerf-Skript (`npx tsx`, nicht eingecheckt)
   `publicHolidays()` aus `src/domain/holidays.ts` für alle 16 Länder und die Jahre 2016 bis 2032 ausgeben und mit der
   Java-Berechnung vergleichen; jede Abweichung ist ein Befund, den die Fach-Spec und die Prüffälle entscheiden, nicht die
   Bibliothek der TypeScript-App (Zeile unter „Bitte bestätigen“). Prüfschritt: Unit-Test mit dem Abgleich als Tabelle der
   Stichproben (Ostersonntag in BB, 08.03.2025 in BE, Fronleichnam 2027).
7. **Adapter `PruefungFachlogikTest`** (Profil 4.1; Regeln für Adapter in `specs/pruefung/format.md`). Klasse
   `de.berichtsheft.pruefung.FachlogikAdapter` (P02 und die folgenden Playbooks ergänzen sie) mit `call(schnittstelle, eingabe)` für die 13
   Schnittstellen von M01; Formate: Zeitpunkt
   mit Offset in Berliner Ortszeit (`2026-10-06T00:30:00+02:00`, AK-1202-09), Kalendertag `JJJJ-MM-TT`, Wochentag `Mo` bis
   `So`, Woche `JJJJ-Www`. Fehler gibt der Adapter als `{ "fehler": "<code>" }` aus der **Art** der Ausnahme
   (`InvalidInstantException`, `InvalidIsoWeekException`, `UnknownFederalStateException`), nie aus dem Meldungstext.
   `uhrVorgeben` ruft `ClockSetup.fromConfiguration` mit `betrieb` (`test` → `bh.betrieb=test`, `produktiv` →
   `produktion`) und meldet `gestellt` danach aus der Uhr; `jetzt` liest aus `ClockHolder`; nach jedem Fall
   `ClockHolder.reset()`. Prüfschritt: `ant pruefung-fachlogik
   -Dbh.pruefung.filter=M01.json` grün (50 Fälle).
8. **Bau-Stand.** M01 in `BauStand.java` eintragen (P00, Schritt 11). Prüfschritt: dieselbe Zeile zeigt keinen M01-Fall
   mehr als „noch nicht gebaut“, alle Fälle anderer Module bleiben „noch nicht gebaut“, keiner rot.
9. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“). Jeden Fehler einzeln einbauen, die genannten Befehle laufen lassen,
   Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur, wenn die benannten Fälle rot werden:

   | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
   | --- | --- | --- | --- |
   | G1-1 (AK-1201) | `ClockSetup.fromConfiguration` ignoriert `betrieb`: die Vorgabe wirkt auch bei `produktion` | AK-1201-04 (`gestellt` ist `true` statt `false`) und der Test „Uhr in Produktion nicht stellbar“ aus P00 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1201`, `ant test-unit` |
   | G1-2 (AK-1201) | `LocalDate.now()` in einer Klasse unter `domain/calendar/` | `AK1201_DomainLiestKeineSystemzeitTest` (kein neutraler Fall zeigt das) | `ant test-unit -Dtest.class=AK1201_DomainLiestKeineSystemzeitTest` |
   | G1-3 (AK-1202) | `calendarDateIn` rechnet mit `ZoneId.systemDefault()` statt Europe/Berlin | bei JVM-Zeitzone GMT: AK-1202-01, AK-1202-04, AK-1202-05, AK-1202-07, AK-1202-08 und `AK1202_UnabhaengigVonJvmZeitzoneTest`; AK-1202-02, AK-1202-03 und AK-1202-06 bleiben grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1202`, `ant test-unit -Dtest.class=AK1202_UnabhaengigVonJvmZeitzoneTest` |
   | G1-4 (AK-1203, AK-1204) | `weeksInYear` liefert immer 53 | AK-1204-01, AK-1204-04, AK-1204-05, AK-1204-06; AK-1203-01 bis AK-1203-10 bleiben grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1204` |
   | G1-5 (AK-1204) | `IsoWeek.of` prüft die Nummer nicht und rechnet KW 0 und KW 54 still ins Nachbarjahr | AK-1204-02, AK-1204-03 (dazu AK-1204-01, AK-1204-04) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1204` |
   | G1-6 (AK-1203) | Wochenrechnung mit `WeekFields.of(Locale…)` und Locale der JVM `en_US` (Woche beginnt Sonntag) | AK-1203-01, AK-1203-03, AK-1203-04 (Jahreswechsel; AK-1203-02 bleibt grün) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1203` mit `-Duser.language=en -Duser.country=US` |
   | G1-7 (AK-1205) | `isFederalState` vergleicht ohne Beachtung der Schreibweise (`equalsIgnoreCase`) | AK-1205-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1205` |
   | G1-8 (AK-1206) | `ONE_TIME` leer | AK-1206-01, AK-1206-03, AK-1206-05 und AK-1206-06 (Berlin 2025 ohne 08.05.) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1206` |
   | G1-9 (AK-1206, AK-404) | Fronleichnam als Feiertag in allen Ländern, dazu 08.08. in BY | AK-404-02, AK-1206-07, AK-1206-08 | `ant pruefung-fachlogik -Dbh.pruefung.filter=M01.json` |
   | G1-10 (AK-1206) | Reformationstag in NI in jedem Jahr | AK-1206-10 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1206` |

   Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein
   benannter Fall nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden. G1-3 und G1-6 zeigen den Fehler
   nur, wenn die Test-JVM wie der Server in GMT (und G1-6 mit der genannten Locale) läuft; in der Zeitzone Europe/Berlin
   bliebe G1-3 grün.
10. **Bau-Stand und Prüfung** nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`.

| Befehl | Erwartet |
| --- | --- |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M01.json` | 50 Fälle grün |
| `ant test-unit` | grün, auch Uhr, Wochen, Bundesländer, Feiertage, `AK1201_DomainLiestKeineSystemzeitTest`, `AK1202_UnabhaengigVonJvmZeitzoneTest` und `DomainOhneLiferayTest` |
| `ant pruefung-fachlogik` | alle Fälle anderer Module „noch nicht gebaut“, keiner rot |
| `ant compile war` | Build ohne Fehler; WAR ohne Jackson und JUnit |
| Gegenprobe aus Schritt 9 | jede Zeile rot wie benannt, danach zurückgenommen und grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job; P01 braucht kein laufendes Portal und keine Ablauf-Fälle.

## 9. Abschluss

- Commit, z. B. „L62 P01: Kalender und Zeit (Uhr, ISO-Wochen, Bundesländer, Feiertage)“; vor dem Push alle Befehle aus
  Abschnitt 8 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-404, AK-1201, AK-1202, AK-1203, AK-1204, AK-1205, AK-1206 mit Test und Prüffällen), der
  Gegenprobe-Tabelle mit Ergebnis, dem Abgleich der Feiertage mit der TypeScript-App und „Bitte bestätigen“.
  Änderungsklasse L62; keine Datei aus `service.xml`, `sql/**`, `upgrade/**` oder `custom-sql/**` betroffen.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Kalendertag um eins verschoben | `LocalDate.now()`, `ZoneId.systemDefault()` oder `java.util.Date` benutzt; Zeitzone ausdrücklich Europe/Berlin, Kalendertag als `LocalDate` (G1-3) |
| Test grün in der Entwicklung, rot auf dem Server | Test-JVM nicht in GMT wie der Server; `-Duser.timezone=GMT` im Ant-Ziel (Schritt 3) |
| Woche am Jahreswechsel falsch | `WeekFields.of(Locale…)` statt ISO-8601 (`IsoFields`); Ergebnis hängt von der Locale ab (G1-6) |
| KW 53 wird für 2027 akzeptiert | Jahr hat 53 Wochen genau dann, wenn der 28. Dezember in KW 53 liegt (G1-4) |
| Ungültige Woche rutscht ins Nachbarjahr | `IsoWeek.of` wirft `InvalidIsoWeekException`, rechnet nicht um (G1-5) |
| Feiertag fehlt oder ist zu viel (Reformationstag, einmalige, regionale) | Referenzdaten aus Abschnitt 5 der Spec, nur landesweite; Abgleich mit der TypeScript-App (Schritt 6) |
| Vorgabe der Uhr wirkt im Produktivbetrieb | `bh.betrieb` prüfen, nicht eine eigene Eigenschaft (G1-1) |
| Gestellte Uhr bleibt im nächsten Fall | im Runner nach jedem Fall `ClockHolder.reset()` |
| Service Builder meldet einen Fehler bei einer Klasse unter `domain/` | nur Klassen, die Service Builder liest, brauchen Sprachstand 7 (Profil 7); `domain/` ist Java 8 und wird nicht gelesen |
| Fachlogik mit Java-8-Datum läuft unter Java 7 nicht | Ausweichregel (gemeinsames Profil 3.2): `Calendar` in UTC und eigene Klasse für Kalendertage; nur bei Java 7 |

## Bitte bestätigen

- [ ] Fachlogik rechnet mit `java.time` (`Instant`, `LocalDate`, `ZoneId`); die Ausweichregel Java 7 (gemeinsames Profil
      3.2) würde P01 neu schreiben (`Calendar` in UTC). Greift sie, ist P01 vor P02 zu wiederholen.
- [ ] Paket `de.berichtsheft.domain.calendar` für Uhr-Erweiterung, Wochen, Bundesländer und Feiertage (Profil 2.1 nennt
      nur `domain/`).
- [ ] Eigene Feiertagsberechnung statt Jollyday (gemeinsames Profil 7): Der Abgleich aus Schritt 6 entscheidet, ob die Ausweiche
      Jollyday 0.5.10 nötig wird (einmalige Feiertage müssten dann ergänzt werden).
- [ ] Der Reformationstag 2017 (bundesweit, einmalig) steht in M01-R15, aber nicht in der Referenzliste von Abschnitt 5 der
      Spec; die Liste in P01 führt ihn mit, der Spec-Eigentümer klärt die Pflege (offener Punkt 10 der Spec).
- [ ] `-Duser.timezone=GMT` in der Test-JVM von `test-unit` (Ergänzung der `build.xml` aus P00, falls dort nicht gesetzt).
- [ ] Das Playbook folgt dem Aufbau aus P05 der Reihe und „Aufbau der Reihe (gilt für P01 bis P10)“ aus
      `playbooks/liferay-72/P00-grundgeruest.md`; die P00 der Reihe 6.2.5 trägt diesen Abschnitt nicht.
