# P03 Wochenberichte entstehen (M03)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket J) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Jeder aktive Azubi hat für jede fällige Woche genau einen Bericht mit fünf Tagen; Tage außerhalb der Ausbildung sind
markiert, Feiertage beim Anlegen vorbelegt und gemerkt; die Übersicht zeigt alle Wochen mit Status, vergangen offene
hervorgehoben. Fachlogik in `de.berichtsheft.domain.generation`, Anlegen in `WeeklyReportLocalServiceImpl` mit
`INSERT … ON CONFLICT DO NOTHING` über `WeeklyReportFinderImpl`, Eindeutigkeit und Wochen-CHECK im Skript „Schutz in der
Datenhaltung“, täglicher Lauf als Scheduler-Eintrag, Seiten „Start“, „Meine Wochen“ und „Azubis“ als Portlets. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M03.json` grün sind (6 AK-IDs; 39 Fälle der Ebene `fachlogik`), davon AK-305-09
   „noch nicht gebaut“ bis P04 (Bau-Stand), also 38 grün;
2. die eigenen Tests grün sind: `AK304_EindeutigJeAzubiUndWocheTest` und `AK1204_WochennummerInDerDatenhaltungTest` in
   `test/db/`, `AK301_FehlenderTagWirdErgaenztTest` in `test/unit/`, `AK304_GleichzeitigesAnlegenTest` und
   `AK305_VorbelegtBleibtGespeichertTest` in `test/integration/` (Schritt 9; kein neutraler Fall prüft Datenhaltung);
3. die **Gegenprobe** aus Schritt 10 durchgeführt ist: jeder benannte Fehler macht genau die benannten Prüffälle bzw.
   Tests rot und ist danach zurückgenommen;
4. der Ablauf-Test `ak-306-wochenuebersicht.spec.ts` in Chromium und bei 375 px grün ist (Schritt 9).

Schemaänderung: ja. Neue Entities `WeeklyReport` (mit Spalte `version`, damit P05 sie nicht nachrüsten muss) und `ReportDay`
(`service.xml`), im Skript „Schutz in der Datenhaltung“ (gemeinsames Profil, Abschnitte 2.3 und 2.6): Fremdschlüssel, eindeutige Indizes, CHECK
`weekly_report_iso_week_range` und die CHECK-Constraints der Aufzählungen. Bis `1.0.0` wird die Demo-Datenbank neu angelegt
(P02, „Bitte bestätigen“).

## 2. Voraussetzungen

- P00 bis P02 der Reihe abgenommen: Gerüst und Prüf-Runner (P00), Uhr, ISO-Wochen und Feiertage in
  `de.berichtsheft.domain.calendar` (P01), `BH_Person` und `BH_Setting`, `canViewReport()`, `DomainRuleException` mit
  `Fehlercode`, das Skript `UpgradeSchutzDerDatenhaltung` und die Testdaten (P02).
- P03 blockiert P04 (Tage speichern braucht Berichte und Tage) und P05.
- Profil 6.2.5: Abschnitte 2.1, 3 (Persistenz, Transaktion, Hintergrundjobs, Schema-Schritte), 4.1, 4.2 (Testschnittstelle)
  und 7 („Lesende Transaktionen“, „Cache nach Custom SQL“, „Scheduler in GMT“, `build.auto.upgrade`). Gemeinsames Profil, Abschnitte 2.2,
  2.3 (Tabellen `BH_WeeklyReport`, `BH_ReportDay`), 2.4 (Cache), 2.5 (Scheduler, `BH_ReminderRun` erst P08) und 2.6.

## 3. Eingaben

- Fach-Spec: `specs/M03-wochenberichte-entstehen.md` (Regeln M03-R01 bis M03-R17, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M03.json`; Formate: `specs/pruefung/format.md`, „Schnittstellen von M03 (Fachlogik)“, „Aufbau
  eines Daten-Falls“ (Ausgangsbestand, Schritt 3) und „Regeln für Adapter“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M03 Wochenberichte entstehen“ (Fallen: Idempotenz durch die
  Datenhaltung, Merker „vorbelegt“ gespeichert, Neuberechnung nur in offenen Berichten).
- Profil: `profile/liferay-625.md`, Abschnitte 3, 4.2 und 7; `profile/liferay-gemeinsam.md`, Abschnitte 2.3, 2.4 und 2.6.
- Abhängig von M01 (Wochen, Feiertage), M02 (Ausbildungszeitraum, Bundesland, aktive Azubis, Sichtbarkeit) und, nur für
  „unberührt“, von M06 (Statuswechsel; bis P05 gibt es keine).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar 1:1 sind die Funktionen in `src/domain/report-generation.ts` (`weeksDue()`,
`planReportDays()`, `isOutsideTraining()`, `correctOutsideTraining()`, `isWeekOutsideTraining()`, `classifyWeek()`,
`isPastOpen()`). Nach Profil neu zu bauen sind `ensureReportsForTrainee()` und `ensureReportsForAllTrainees()` in
`src/lib/reports.ts` (Prisma `createMany` mit `skipDuplicates` wird zu Custom SQL mit `ON CONFLICT DO NOTHING`, die Prisma-Transaktion
zur Service-Transaktion von 6.2.5), `listTraineeWeeks()` und `src/lib/trainee-overview.ts`. Die Seiten unter `src/app/(app)/azubi/`
zeigen den Inhalt, die Umsetzung sind Portlets. Belege zum Abgleich: `src/domain/report-generation.test.ts`,
`tests/db/reports.test.ts`, `e2e/ak-301-408-berichte-erfassen.spec.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Schema und Skript, (2) reine Funktionen, (3) Anlegen im Service, (4) Übersichten, (5) täglicher Lauf,
(6) Portlets, (7) Adapter und Testschnittstelle, (8) eigene Tests, (9) Gegenprobe. Zählweise der Prüffälle: alle Fälle der
Prüffall-Datei je AK-ID; M03 hat kein Ablauf-Szenario in `specs/pruefung/szenarien.json`. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-301 | Für jede Woche vom Ausbildungsbeginn bis zur aktuellen Woche existiert automatisch genau ein Bericht im Status „Entwurf“; Beispiel Beginn 01.09.2026, heute 06.10.2026 → KW 36–41. | 3 (3 fachlogik): AK-301-01, AK-301-02, AK-301-03 | `specs/pruefung/M03.json` |
| AK-302 | Für zukünftige Wochen gibt es keine Berichte; mit Beginn einer neuen Woche erscheint ihr Bericht automatisch. | 4 (4 fachlogik): AK-302-01, AK-302-02, AK-302-03, AK-302-04 | `specs/pruefung/M03.json` |
| AK-303 | Nach dem Ausbildungsende entstehen keine Berichte mehr. | 4 (4 fachlogik): AK-303-01, AK-303-02, AK-303-03, AK-303-04 | `specs/pruefung/M03.json` |
| AK-304 | Kein manuelles oder doppeltes Anlegen; pro Azubi und Woche immer genau ein Bericht. | 2 (2 fachlogik): AK-304-01, AK-304-02 | `specs/pruefung/M03.json` |
| AK-305 | Tage außerhalb der Ausbildung (Beginn oder Ende mitten in der Woche) sind ausgegraut, brauchen weder Tagesart noch Text und sind nicht änderbar. | 9 (9 fachlogik): AK-305-01 bis AK-305-09, davon AK-305-09 (`tageSpeichern`) bis P04 zurückgestellt | `specs/pruefung/M03.json` |
| AK-306 | Übersicht mit allen Wochen und Status, vergangene offene hervorgehoben; Ausbilder sehen dieselbe Liste lesend; Wochen ganz außerhalb der Ausbildung zählen nie als offen, unberührte sind ausgeblendet, andere markiert. | 17 (17 fachlogik): AK-306-01 bis AK-306-17 | `specs/pruefung/M03.json` |

Summe: 6 AK-IDs, 39 Prüffälle (alle `fachlogik`), kein Szenario. Daten- und Ablauf-Fälle gibt es in M03 nicht: Eindeutigkeit
bei gleichzeitigem Anlegen, Wochen-CHECK der Datenhaltung, gespeicherter Merker „vorbelegt“ und die Seiten prüfen die
eigenen Tests aus Schritt 9 (Fach-Spec, Abschnitt 4: „folgt mit dem Daten-Runner“; M03-R04, M03-R05, M03-R10). AK-404
(Vorbelegen) gehört M01; die Fälle AK-305-03 bis AK-305-05 zeigen es beim Anlegen.

## 6. Empfehlung

**Weg B.** Die Regeln sind klein und durch die Prüffälle eng geführt; die Gefahr liegt in der Datenhaltung von 6.2.5, nicht
in den Regeln: Service Builder schreibt über Hibernate und bricht bei einem doppelten Schlüssel die ganze Transaktion ab
(PostgreSQL), die Eindeutigkeit muss deshalb im SQL des Anlegens stehen (Schritt 4). Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`.

1. **Branch** `claude/l62-p03-wochenberichte-entstehen`; Spec (M03-R01 bis M03-R17), Profil 6.2.5, Abschnitte 3 und 7 und Prüffälle lesen.
   Prüfschritt: AK-Tabelle aus Abschnitt 5 im PR-Entwurf.
2. **Schema und Skript** (gemeinsames Profil, Abschnitte 2.3 und 2.6; Profil 6.2.5, Abschnitte 3 „Persistenz“ und 7 „`build.auto.upgrade`“). `service.xml`: Entity
   `WeeklyReport` (`weeklyReportId`, `companyId`, `traineeId`, `isoYear`, `isoWeek`, `status` mit Anfang `DRAFT`, `version`
   mit Anfang 0, `createdAt`, `updatedAt`; `mvcc-enabled` nach dem Ergebnis von P00, gemeinsames Profil, Abschnitt 2.4) und `ReportDay`
   (`reportDayId`, `weeklyReportId`, `dayDate` als Text `JJJJ-MM-TT`, `dayType` leer oder einer der fünf Werte, `activities`
   bis 5.000 Zeichen, `outsideTraining`, `holidayPreset`); beide mit `remote-service="false"`, damit die
   `*LocalServiceImpl`-Methoden nicht als Web-Service des Portals erreichbar sind. Finder: `WeeklyReport` nach `traineeId`
   und der eindeutige Finder (`traineeId`, `isoYear`, `isoWeek`), `ReportDay` nach `weeklyReportId`; Spaltenlängen in
   `portlet-model-hints.xml`. `ant build-service`; erzeugte `tables.sql` gegen gemeinsames Profil, Abschnitt 2.3 vergleichen. Das Skript
   `schutz-in-der-datenhaltung.sql` (P02) wächst um: Fremdschlüssel `traineeId` auf `BH_Person` (`ON DELETE CASCADE`) und
   `weeklyReportId` auf `BH_WeeklyReport` (`ON DELETE CASCADE`), eindeutiger Index (`traineeId`, `isoYear`, `isoWeek`)
   und (`weeklyReportId`, `dayDate`), **`weekly_report_iso_week_range`** (Nummer 1 bis 52, die 53 nur, wenn
   `EXTRACT(WEEK FROM make_date(isoYear, 12, 28)) = 53`; M03-R05, M01-R08) sowie CHECK-Constraints für `status`,
   `dayType` und das Format von `dayDate`. Prüfschritt: `ant build-service deploy`; `psql` zeigt die Constraints; ein
   zweiter Bericht für dieselbe Woche scheitert mit SQLSTATE `23505`, KW 53/2027 mit `23514`.
3. **Fachfunktionen `de.berichtsheft.domain.generation.ReportGeneration`** (Gegenstück zu
   `src/domain/report-generation.ts`; M03-R01 bis M03-R16; Java 8, kein Import aus `com.liferay.*`, „jetzt“ als Parameter
   aus P01): `weeksDue(beginn, ende, now)` (von der Woche des Beginns bis zur aktuellen Woche, höchstens bis zur Woche des
   Endes; Beginn in der Zukunft ergibt nichts; AK-301, AK-302, AK-303, AK-304), `planReportDays(woche, beginn, ende,
   bundesland)` mit `PlannedDay` (fünf Tage Mo–Fr; Beginn und Ende gehören zur Ausbildung; Tage außerhalb markiert und nie
   vorbelegt; Feiertag innerhalb als Tagesart `HOLIDAY` mit Merker `holidayPreset`; AK-305, AK-404),
   `isOutsideTraining()`, `correctOutsideTraining(tage, beginn, ende, bundesland)` mit `StoredDay` und `DayCorrection`
   (Markierung neu, Inhalte bleiben, neu einbezogener Tag ohne Tagesart wird nach dem **aktuellen** Bundesland vorbelegt;
   AK-305), `missingDays(woche, vorhandeneTage)` (M03-R07: nur fehlende Tage), `isWeekOutsideTraining()`,
   `classifyWeek(woche, status, inhalt, historie, beginn, ende, now)` mit `WeekForOverview` und `WeekClassification`
   (ausgeblendet, außerhalb, offen, vergangen offen; AK-306) und `isPastOpen()` (die aktuelle Woche zählt nicht). Dazu das
   Mindeste aus M05 für „offen“ (M03-R14): `de.berichtsheft.domain.status.ReportStatus` (`DRAFT`, `SUBMITTED`, `APPROVED`,
   `REJECTED`) und `ReportStatusRules.isOpenStatus()`; P05 ergänzt `ReportStatusRules` um das Statusmodell, ohne diese Namen zu
   ändern. Fehler der Woche und des Bundeslands kommen als Ausnahmen aus P01 (`InvalidIsoWeekException`,
   `UnknownFederalStateException`). Prüfschritt: Unit-Tests in `test/unit/` mit Namen ab der AK-ID.
4. **Anlegen `WeeklyReportLocalServiceImpl`** (M03-R01 bis M03-R07, M03-R10 bis M03-R13; AK-301 bis AK-305). Die
   Methoden heißen `ensureReportsForTrainee(traineeId)` und `ensureReportsForAllTrainees()` (nie `get…`: sie schreiben,
   Profil 6.2.5, Abschnitt 7 „Lesende Transaktionen“). Ablauf in **einer** Service-Transaktion: Person und Bundesland lesen, `weeksDue()` und
   `planReportDays()` rechnen; dann Custom SQL in `WeeklyReportFinderImpl` (`custom-sql/default.xml`): `insertMissingReport`
   (`INSERT INTO BH_WeeklyReport … ON CONFLICT (traineeId, isoYear, isoWeek) DO NOTHING`, Gegenstück zu `createMany` mit
   `skipDuplicates`, Schlüssel aus dem Zähler `CounterLocalServiceUtil.increment`) und `insertMissingDay` (ebenso mit
   `ON CONFLICT (weeklyReportId, dayDate) DO NOTHING`). Der doppelte Schlüssel darf **keine Ausnahme** auslösen, weil
   PostgreSQL die Transaktion danach abbricht (Profil 6.2.5, Abschnitt 7 „Zurückrollen“); eine zweite, gleichzeitige Transaktion wartet auf
   die erste, legt nichts an und sieht danach deren Bericht. Tage legt die Transaktion für jeden Bericht der Wochen an,
   auch für einen schon vorhandenen, dem Tage fehlen (`missingDays()`, M03-R07; vorhandene Tage und Inhalte bleiben).
   **Deaktivierte Azubis** bekommen keine neuen Berichte, bestehende bleiben (M03-R06); `ensureReportsForAllTrainees()`
   nimmt nur aktive Azubis mit Ausbildungsbeginn. Eine Zeitraumänderung (M02, AK-203) ruft `ensureReportsForTrainee()` und
   anschließend `correctOutsideTraining()` für Berichte mit offenem Status (`isOpenStatus()`, auch für Wochen ganz außerhalb);
   eingereichte und freigegebene Berichte und die deaktivierter Azubis bleiben unverändert (M03-R13); der Aufruf liegt in
   `PersonLocalServiceImpl.updatePerson` aus P02 (dort in derselben Transaktion ergänzen). Der Merker `holidayPreset` wird
   gespeichert, nie aus dem Bundesland neu berechnet (M03-R10). Nach dem Custom SQL Entity- und Finder-Cache von `WeeklyReport`
   und `ReportDay` leeren (Profil 6.2.5, Abschnitt 7). Es entsteht kein Bericht ohne Tage. Prüfschritt: Unit-Tests; `ant test-db` für Schritt 9.
5. **Übersichten** (lesend; Methodenpräfix `get`): `getTraineeWeeks(viewer, traineeId)` (alle nicht ausgeblendeten Wochen,
   neueste zuerst, eingeordnet mit `classifyWeek()`; Azubi nur die eigene, Ausbilder jede, nur lesend, `canViewReport()` aus
   P02, sonst `zugriff_verweigert`; AK-103, AK-105, AK-306) und `getTraineesWithProgress(viewer)` (nur Ausbilder: je Azubi
   Wochen, freigegebene, vergangen offene, letzte Einreichung; M03-R17). `inhalt` heißt: mindestens ein Tag hat eine Tagesart
   oder einen Text; `historie`: mindestens ein Statuswechsel. Bis P05 gibt es keine Statuswechsel: `hasStatusChange()` im
   Finder liefert bis dahin immer „nein“ (Platzhalter mit Test, den P05 scharf stellt, wie `hasForeignHistory()` in P02);
   die Tabelle `BH_StatusChange` gibt es noch nicht. Ausgeblendet wird nur in der Anzeige; gelöscht wird nichts.
   Prüfschritt: Test „Wochen ganz außerhalb zählen nicht als offen“.
6. **Täglicher Lauf und Seitenaufrufe.** `de.berichtsheft.scheduler.WochenAnlegenMessageListener` ruft
   `ensureReportsForAllTrainees()`; Eintrag `scheduler-entry` in `liferay-portlet.xml` mit Speicherart `MEMORY_CLUSTERED`
   (Profil 6.2.5, Abschnitt 3 „Hintergrundjobs“). Quartz rechnet in GMT; weil das Anlegen idempotent ist und die Woche aus der Uhr nach
   Europe/Berlin kommt, genügt ein fester Zeitpunkt nach Mitternacht Berliner Zeit: `0 0 3 * * ?` (3:00 Uhr GMT, also
   4:00 oder 5:00 Uhr in Berlin). Bis zum Lauf holt jeder Aufruf der Seiten „Start“, „Wochen“ und „Azubis“ das Anlegen nach
   (M03-R02). Dieselbe Methode ruft die Testschnittstelle (Schritt 7). Prüfschritt: Tomcat-Log zeigt den Eintrag beim
   Deployment; `berichte_anlegen` startet den Listener von Hand.
7. **Portlets, Adapter und Testschnittstelle.** `MVCPortlet`-Klassen unter `de.berichtsheft.portlet`: `StartPortlet` (aus
   P02) zeigt für Azubis die aktuelle Woche („Diese Woche“, Merker `data-woche`) und „Zu erledigen“, `WochenPortlet`
   („Meine Wochen“, `wochen`) und `AzubisPortlet` („Azubis“ mit Liste und Übersicht je Azubi, nur Ausbilder). Jede
   Aktion ruft den Service, und der Service prüft selbst; ausgeblendete Menüpunkte sind kein Schutz. Merker der Wochen wie
   in `src/components/WeekOverview.tsx`: `data-woche`, `data-past-open`, `data-outside-training`. Die Portlets rufen vor dem
   Lesen `ensureReportsForTrainee()` auf. Gestaltung folgt in P09. **Fachlogik-Adapter** (`FachlogikAdapter` aus P01 und P02):
   `faelligeWochen`, `berichtstageAnlegen`, `ausserhalbNeuBerechnen`, `istOffen`, `wocheEinordnen` nach `specs/pruefung/format.md`
   („Schnittstellen von M03“); Status als `Entwurf`, `Eingereicht`, `Freigegeben`, `Abgelehnt`, Tagesart als Text oder `null`;
   der Fall nennt `uhr`, der Runner stellt die Uhr vor dem Fall und setzt sie danach zurück; `tageSpeichern` (AK-305-09) bleibt im
   Bau-Stand zurückgestellt bis P04. **Daten-Ausgangsbestand:** Die Testschnittstelle ergänzt Schritt 3 („Berichte
   entstehen wie in M03 bis ‚jetzt‘“) mit der neuen Aktion `berichte_anlegen` (für einen Azubi oder alle aktiven; nur bei
   `bh.betrieb=test`; ruft denselben Service wie das Portlet und der Scheduler) und gibt den Bestand `berichte` mit `status`
   und `tage` zurück; `historie` und `kommentare` folgen in P05 und P06. Personen stehen an der Grenze zum Prüf-Adapter als Schlüssel (`anna`); Kennungen wie die Konto-ID (`userId`) und die `weeklyReportId` gehen immer als Text (String), nie als JSON-Zahl (Profil 6.2.5, Abschnitt 4.2). Prüfschritt: `ant pruefung-fachlogik
   -Dbh.pruefung.filter=M03.json` grün (38 Fälle, AK-305-09 „noch nicht gebaut“); `berichte_anlegen` für Anna zu
   `uhr` 06.10.2026 ergibt KW 36 bis 41.
8. **Bau-Stand.** M03 in `BauStand.java` eintragen; AK-305-09 bleibt zurückgestellt (P04). Prüfschritt: dieselbe Zeile wie
   in Schritt 7, kein roter Fall.
9. **Eigene Tests** (Namen beginnen mit der AK-ID, JUnit ohne Bindestrich, Profil 6.2.5, Abschnitt 4.1):
   - `AK304_EindeutigJeAzubiUndWocheTest` (`test/db/`): (a) ein zweiter `INSERT` für denselben Azubi und dieselbe Woche
     scheitert mit `23505`; (b) zwei JDBC-Verbindungen fügen gleichzeitig denselben Bericht ein, genau eine gelingt; (c) A
     legt in einer offenen Transaktion den Bericht an, B führt das SQL `insertMissingReport` (aus `custom-sql/default.xml`
     gelesen) aus und wartet, bis A abschließt; B ändert danach 0 Zeilen und wirft nichts.
   - `AK1204_WochennummerInDerDatenhaltungTest` (`test/db/`): KW 53/2026 gelingt; KW 53/2027, KW 0 und KW 54 scheitern mit
     `23514`; KW 52/2027 gelingt (M03-R05, kein neutraler Fall prüft die Datenhaltung).
   - `AK301_FehlenderTagWirdErgaenztTest` (`test/unit/`): `missingDays()` liefert bei vier vorhandenen Tagen genau den
     fünften, bei fünf Tagen nichts (M03-R07).
   - `AK304_GleichzeitigesAnlegenTest` (`test/integration/`): „AK-304 von zwei gleichzeitigen Aufrufen entsteht jede Woche
     genau einmal“; Anna ohne Berichte, Uhr 06.10.2026; zwei Threads mit Startschranke rufen `berichte_anlegen`; beide
     antworten ohne Fehler, es gibt sechs Berichte (KW 36 bis 41) mit je genau fünf Tagen, keiner ohne Tage.
   - `AK305_VorbelegtBleibtGespeichertTest` (`test/integration/`): Uhr 31.05.2027, Beginn 01.09.2026, Bundesland `NW`:
     Donnerstag 27.05.2027 (Fronleichnam) ist `HOLIDAY` mit Merker; danach Bundesland `NI` (Testaktion
     `bundesland_einstellen`, ruft den Service von P02), `berichte_anlegen` erneut: Tagesart und Merker unverändert
     (M03-R10); Zeitraum ändern und zurück: Inhalt bleibt (M03-R11).
   - Playwright `liferay-625/e2e/ak-306-wochenuebersicht.spec.ts`: Anna sieht bei Uhr 06.10.2026 die Wochen KW 41 bis 36 in
     dieser Reihenfolge, KW 36 bis 40 mit `data-past-open`, KW 41 ohne; Bernd sieht dieselbe Liste über `azubis`, ohne
     Eingabefelder; Anna ruft die Seite `azubis` per Adresse auf und bekommt keinen Zugang.
   Prüfschritt: `ant test-unit test-db test-integration` und der Playwright-Lauf grün.
10. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“; Profil 6.2.5, Abschnitt 7 „Zurückrollen“). Jeden Fehler einzeln einbauen, die genannten
    Befehle laufen lassen, Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur, wenn die benannten
    Fälle rot werden:

    | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
    | --- | --- | --- | --- |
    | G3-1 (AK-303) | `weeksDue` ignoriert das Ausbildungsende | AK-303-01 und AK-303-04; AK-303-02 und AK-303-03 bleiben grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-303` |
    | G3-2 (AK-302) | `weeksDue` bestimmt die aktuelle Woche mit dem UTC-Datum statt Europe/Berlin | AK-302-02 (Montag 0:00 Uhr Berlin ist noch UTC-Sonntag); AK-302-01 bleibt grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-302` (Test-JVM in GMT, P01) |
    | G3-3 (AK-302) | `weeksDue` nimmt den Beginn in der Zukunft mit (Schleife läuft mindestens einmal) | AK-302-03 und AK-302-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-302` |
    | G3-4 (AK-304) | die Folgewoche zählt die Nummer hoch bis 53, ohne die Wochenzahl des Jahres zu beachten | AK-304-02 (2027 hat keine KW 53); AK-304-01 bleibt grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-304` |
    | G3-5 (AK-305) | das Ausbildungsende zählt nicht zur Ausbildung (`>=` statt `>`) | AK-305-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-305` |
    | G3-6 (AK-305) | Feiertage werden auch für Tage außerhalb der Ausbildung vorbelegt | AK-305-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-305` |
    | G3-7 (AK-305) | `correctOutsideTraining` überschreibt die eingetragene Tagesart eines neu einbezogenen Feiertags | AK-305-08 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-305` |
    | G3-8 (AK-306) | `classifyWeek` berechnet `offen` nur aus dem Status, ohne die Woche ganz außerhalb auszunehmen | AK-306-11, AK-306-12, AK-306-13, AK-306-16; AK-306-17 bleibt grün (Status „Eingereicht“) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-306` |
    | G3-9 (AK-306) | `isPastOpen` hebt auch die aktuelle Woche hervor (`<=` statt `<`) | AK-306-06 und der Ablauf-Test `ak-306-wochenuebersicht.spec.ts` (KW 41 mit `data-past-open`) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-306`, Playwright |
    | G3-10 (AK-306) | `isOpenStatus` zählt „Eingereicht“ mit | AK-306-03 und AK-306-07 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-306` |
    | G3-11 (AK-306) | `classifyWeek` blendet jede Woche ganz außerhalb aus, auch mit Inhalt oder Historie | AK-306-12, AK-306-13, AK-306-17 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-306` |
    | G3-12 (AK-304) | eindeutiger Index (`traineeId`, `isoYear`, `isoWeek`) im Skript ausgelassen | `AK304_EindeutigJeAzubiUndWocheTest` (a) und (b) sowie `AK304_GleichzeitigesAnlegenTest` (kein neutraler Fall zeigt das) | `ant test-db -Dtest.class=AK304_EindeutigJeAzubiUndWocheTest`, `ant test-integration -Dtest.class=AK304_GleichzeitigesAnlegenTest` |
    | G3-13 (AK-304) | `insertMissingReport` ohne `ON CONFLICT DO NOTHING` | `AK304_EindeutigJeAzubiUndWocheTest` (c): B scheitert nach dem Abschluss von A mit `23505` | `ant test-db -Dtest.class=AK304_EindeutigJeAzubiUndWocheTest` |
    | G3-14 (AK-1204) | `weekly_report_iso_week_range` nur mit „1 bis 53“ (Stand vor G2) | `AK1204_WochennummerInDerDatenhaltungTest` (KW 53/2027 gelingt) | `ant test-db -Dtest.class=AK1204_WochennummerInDerDatenhaltungTest` |
    | G3-15 (AK-305) | der Merker `holidayPreset` wird beim erneuten Anlegen aus dem aktuellen Bundesland berechnet | `AK305_VorbelegtBleibtGespeichertTest` | `ant test-integration -Dtest.class=AK305_VorbelegtBleibtGespeichertTest` |
    | G3-16 (AK-301) | `missingDays` liefert immer alle fünf Tage | `AK301_FehlenderTagWirdErgaenztTest` | `ant test-unit -Dtest.class=AK301_FehlenderTagWirdErgaenztTest` |

    Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein
    benannter Fall nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden. G3-2 zeigt den Fehler nur,
    wenn die Test-JVM wie der Server in GMT läuft (P01, Schritt 3).
11. **Prüfung** nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant test-unit` | grün, auch `AK301_FehlenderTagWirdErgaenztTest` und `DomainOhneLiferayTest` |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M03.json` | 39 Fälle: 38 grün, AK-305-09 „noch nicht gebaut“ (bis P04), keiner rot |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M01.json` | 50 Fälle weiterhin grün |
| `ant test-db` | grün, auch `AK304_EindeutigJeAzubiUndWocheTest` und `AK1204_WochennummerInDerDatenhaltungTest` |
| `ant test-integration` | grün, auch `AK304_GleichzeitigesAnlegenTest` und `AK305_VorbelegtBleibtGespeichertTest` |
| `ant build-service deploy` | Skript läuft, Tabellen und Constraints vorhanden; Scheduler-Eintrag im Tomcat-Log |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "ak-306"` | grün |
| Gegenprobe aus Schritt 10 | jede Zeile rot wie benannt, danach zurückgenommen und grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job; im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L62 P03: Wochenberichte entstehen (Anlegen, Eindeutigkeit, Übersichten)“; vor dem Push alle Befehle aus
  Abschnitt 8 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-301, AK-302, AK-303, AK-304, AK-305, AK-306 mit Test und Prüffällen), dem zurückgestellten
  Fall AK-305-09, der Gegenprobe-Tabelle mit Ergebnis und „Bitte bestätigen“. `service.xml`, `sql/**`, `upgrade/**`,
  `custom-sql/**` und `service/impl/**` sind sicherheitsrelevant (gemeinsames Profil, Abschnitt 5); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Zweites Anlegen bricht mit „current transaction is aborted“ ab | `INSERT … ON CONFLICT DO NOTHING` statt `addWeeklyReport` und Ausnahme abfangen; PostgreSQL bricht die Transaktion nach dem Fehler ab (G3-13) |
| Doppelte Berichte bei gleichzeitigem Aufruf | eindeutiger Index im Skript, nicht nur Prüfung im Code (G3-12) |
| Bericht ohne Tage sichtbar | Bericht und Tage in derselben Service-Transaktion anlegen; Methode heißt nicht `get…` (Profil 6.2.5, Abschnitt 7) |
| Anlegen speichert nichts | Methodenname mit `get`, `is`, `has` läuft nur lesend |
| Übersicht zeigt alte Berichte nach dem Anlegen | Entity- und Finder-Cache nach dem Custom SQL leeren (Profil 6.2.5, Abschnitt 7) |
| „Feiertag (vorbelegt)“ ändert sich nach Bundeslandwechsel | den gespeicherten Merker `holidayPreset` lesen, nicht Feiertage neu berechnen (G3-15) |
| KW 53 in der Datenhaltung akzeptiert | CHECK mit der genauen Regel (28. Dezember), nicht nur 1 bis 53 (G3-14) |
| Woche ganz außerhalb wird gezählt oder gespeichert | `classifyWeek()` rechnet aus dem aktuellen Zeitraum, gespeichert wird dazu nichts (G3-8) |
| Neue Woche erscheint erst am Dienstag | Lauf nur einmal täglich; Seitenaufrufe holen das Anlegen nach (Schritt 6); Uhr nach Europe/Berlin prüfen (G3-2) |
| Zeitraumänderung ändert freigegebene Berichte | Neuberechnung nur für Berichte mit offenem Status |
| Web-Service des Portals bietet `ensureReportsForTrainee` an | `remote-service="false"` in `service.xml` (Schritt 2) |
| `hasStatusChange` wirft vor P05 einen SQL-Fehler | Platzhalter liefert „nein“; die Tabelle `BH_StatusChange` gibt es erst ab P05 |

## Bitte bestätigen

- [ ] Anlegen über Custom SQL mit `INSERT … ON CONFLICT DO NOTHING` (PostgreSQL ab 9.5) statt über die Persistenz von
      Service Builder: Gegenstück zu `createMany` mit `skipDuplicates`; nur so bricht das gleichzeitige Anlegen die
      Transaktion nicht ab. Alternative: Zeilensperre auf `BH_Person` des Azubis; sie widerspräche der Aussage in
      gemeinsames Profil, Abschnitt 2.4, dass das Anlegen nicht sperrt.
- [ ] Testaktionen `berichte_anlegen` und `bundesland_einstellen` der Testschnittstelle (nur bei `bh.betrieb=test`), kein
      neutraler Fall, keine Änderung an `specs/pruefung/format.md`. Gibt es `bundesland_einstellen` schon aus P02, entfällt
      die zweite.
- [ ] Täglicher Lauf `0 0 3 * * ?` (3:00 Uhr GMT = 4:00 oder 5:00 Uhr Berlin), weil die Fachlogik die Woche aus der Uhr nach
      Europe/Berlin bestimmt und der Lauf idempotent ist; M03 Abschnitt 8 verlangt „nach Berliner Zeit“.
- [ ] `hasStatusChange()` als Platzhalter („nein“) bis P05; `ReportStatus` und `isOpenStatus()` legt P03 an, P05 baut darauf auf.
- [ ] Namen der CHECK-Constraints für `status`, `dayType` und das Format von `dayDate`: gemeinsames Profil, Abschnitte 2.1 und 2.3 nennen
      keine Namen; sie müssen auf 6.2.5 und 7.2 gleich sein (Abgleich mit der Reihe 7.2).
- [ ] `remote-service="false"` für alle Entities der App (Profil 6.2.5, Abschnitt 2.1 sagt dazu nichts).
- [ ] Das Playbook folgt dem Aufbau aus P05 der Reihe und „Aufbau der Reihe (gilt für P01 bis P10)“ aus
      `playbooks/liferay-72/P00-grundgeruest.md`; die P00 der Reihe 6.2.5 trägt diesen Abschnitt nicht.
