# P03 Wochenberichte entstehen (M03)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket K) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Aus Ausbildungsbeginn und -ende entstehen die Wochenberichte eines Azubis automatisch: fällige Wochen, fünf Tage Mo–Fr je
Bericht, Tage außerhalb der Ausbildung markiert, Feiertage vorbelegt, ganz ausgeblendete Wochen, Übersicht „Meine Wochen“ und
Azubi-Liste des Ausbilders. Fachregeln liegen als reine Java-Klassen in `bh-domain`, das Anlegen in
`WeeklyReportLocalServiceImpl` (eine Transaktion, Eindeutigkeit durch die Datenbank), der Lauf im Scheduler. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M03.json` über den Fachlogik-Adapter grün sind (6 AK-IDs; 39 Prüffälle der Ebene `fachlogik`,
   keine Daten-, Ablauf- oder Szenario-Fälle), davon AK-305-09 zurückgestellt bis P04 (er ruft `tageSpeichern` aus M04): 38 grün,
   1 sichtbar „noch nicht gebaut“;
2. die plattformeigenen Tests grün sind: `WeekGenerationTest` (AK-301, AK-302, AK-304, AK-205 und die Atomarität des Anlegens),
   `ReportConstraintsTest` (AK-304 und die Wochennummer in der Datenhaltung), `WeekGenerationJobTest` (AK-302) und
   `OverviewAccessTest` (AK-306); sie belegen, was kein neutraler Fall zeigt (Gleichzeitigkeit, Datenhaltung, Scheduler,
   Zugriff);
3. jede Gegenprobe aus Schritt 11 die dort benannten Prüffälle bzw. Tests rot gemacht hat und zurückgenommen ist.

Schemaänderung: die Entities `WeeklyReport` und `ReportDay` (gemeinsam 2.3) und im Skript „Schutz in der Datenhaltung“ (gemeinsam
2.6) Fremdschlüssel, CHECK-Constraints und Eindeutigkeit dieser zwei Tabellen; Migration über den Upgrade-Schritt aus P00. Keine
Abweichung gegenüber der TypeScript-App.

## 2. Voraussetzungen

- L72-P00, L72-P01 (Wochen, Feiertage, Uhr) und L72-P02 (Personen, Zugriff, Bundesland, `getActiveTrainees()`) abgenommen und
  gemergt. M03 ist die Grundlage von M04, M05 und M08; die Tabelle `BH_WeeklyReport` trägt deshalb schon `status` und `version`
  (gemeinsam 2.3, 2.4).
- Profil 7.2: Abschnitt 3 (Persistenz, Transaktion und Gleichzeitigkeit, Hintergrundjobs, Zeitplan 3.3), 4 (Daten-Adapter,
  plattformeigene Tests) und 7 („Service Builder schreibt am Cache vorbei“, Scheduler in UTC); gemeinsam 2.2, 2.3 und 2.6.
- Der Scheduler-Eintrag liegt im Modul `bh-notification` (Profil 2); P08 nutzt dieselbe Registrierung für Ausgangskorb und
  Erinnerung.

## 3. Eingaben

- Fach-Spec: `specs/M03-wochenberichte-entstehen.md` (Regeln M03-R01 bis M03-R17, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 10 offene Punkte).
- Prüffälle: `specs/pruefung/M03.json`; Schnittstellen und Formate: `specs/pruefung/format.md`, „Schnittstellen von M03“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M03 Wochenberichte entstehen“ (Spalte „Plattformgebunden“, „Fallen“).
- Gegenstück der Referenz-Umsetzung: `playbooks/typescript/P03-wochenberichte-entstehen.md` (nur zum Abgleich).
- Abhängig von M01 (Wochen, Feiertage, Uhr) und M02 (Ausbildungszeitraum, aktive Azubis, Bundesland, Zugriff).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. `src/domain/report-generation.ts` (`weeksDue()`, `planReportDays()`, `correctOutsideTraining()`,
`classifyWeek()`, `isPastOpen()`) lässt sich von oben nach unten 1:1 nach Java übersetzen. Nicht übertragbar sind
`ensureReportsForTrainee()`, `listTraineeWeeks()` in `src/lib/reports.ts` und `listTraineesWithProgress()` in
`src/lib/trainee-overview.ts`: Sie hängen an Prisma; auf 7.2 ersetzen sie Service Builder mit Custom SQL (Schritt 6). Belege der
Referenz: `src/domain/report-generation.test.ts`, `tests/db/reports.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Entities, Eindeutigkeit und Wochen-CHECK, (2) reine Funktionen für fällige Wochen, Tage und Einordnung, (3)
Anlegen in einer Transaktion, (4) Übersichten, (5) Scheduler-Lauf, (6) Portlets, (7) Adapter und plattformeigene Tests. Zu jedem
AK die Prüffälle (alle in `specs/pruefung/M03.json`; Zählweise: Prüffälle **ohne** Ablauf-Szenario, M03 hat keines):

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-301 | Für jede Woche vom Ausbildungsbeginn bis zur aktuellen Woche existiert automatisch genau ein Bericht im Status „Entwurf“; Beispiel Beginn 01.09.2026, heute 06.10.2026 → KW 36–41. | 3 (3 fachlogik) | gleichwertig; Bericht und fünf Tage in einer Transaktion (Schritt 5) |
| AK-302 | Für zukünftige Wochen gibt es keine Berichte; mit Beginn einer neuen Woche erscheint ihr Bericht automatisch. | 4 (4 fachlogik) | gleichwertig; „automatisch“ durch Scheduler-Takt (Profil 3.3) und beim Aufruf der Übersicht; Test `WeekGenerationJobTest.AK302_…` |
| AK-303 | Nach dem Ausbildungsende entstehen keine Berichte mehr. | 4 (4 fachlogik) | gleichwertig |
| AK-304 | Kein manuelles oder doppeltes Anlegen; pro Azubi und Woche immer genau ein Bericht. | 2 (2 fachlogik) | gleichwertig; Eindeutigkeit und Wochen-CHECK in der Datenhaltung, Nachweis `ReportConstraintsTest.AK304_…` und `WeekGenerationTest.AK304_…` |
| AK-305 | Tage außerhalb der Ausbildung (Beginn oder Ende mitten in der Woche) sind ausgegraut, brauchen weder Tagesart noch Text und sind nicht änderbar. | 9 (9 fachlogik) | gleichwertig; AK-305-09 zurückgestellt bis P04 (Schnittstelle `tageSpeichern`), die anderen 8 gebaut |
| AK-306 | Übersicht mit allen Wochen und Status, vergangene offene hervorgehoben; Ausbilder sehen dieselbe Liste lesend; Wochen ganz außerhalb der Ausbildung zählen nie als offen, unberührte sind ausgeblendet, andere markiert. | 17 (17 fachlogik) | gleichwertig; Zugriff im Service, Nachweis `OverviewAccessTest.AK306_…` |

Summe: 6 AK-IDs, 39 Prüffälle (39 fachlogik, 0 daten, 0 ablauf, 0 Szenario), davon 1 zurückgestellt.

## 6. Empfehlung

**Weg B.** Die Regeln sind klein und durch die Prüffälle eng geführt; der Plattformteil (Eindeutigkeit bei gleichzeitigem
Anlegen, Scheduler, Cache) folgt dem Profil und hat in der Referenz kein Gegenstück, das sich übertragen ließe. Weg A nur für die
Übersetzung von `report-generation.ts` und nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l72-p03-wochenberichte-entstehen`; Spec (insbesondere M03-R04 bis M03-R06, M03-R10 bis M03-R15) und Prüffälle
   lesen. Prüfschritt: AK-Tabelle (Abschnitt 5) im PR-Entwurf.
2. **Entities und Datenhaltung** in `modules/bh/bh-service/service.xml` nach gemeinsam 2.3: `WeeklyReport` (`BH_WeeklyReport`:
   `traineeId`, `isoYear`, `isoWeek`, `status` mit Anfang `DRAFT`, `version` int mit Anfang 0, `createdAt`, `updatedAt`) mit
   eindeutigem Finder (`traineeId`, `isoYear`, `isoWeek`) und `ReportDay` (`BH_ReportDay`: `weeklyReportId`, `dayDate` als
   `VARCHAR(10)` im Format `JJJJ-MM-TT`, `dayType` leer erlaubt, `activities` als `TEXT`, `outsideTraining`, `holidayPreset`) mit
   eindeutigem Finder (`weeklyReportId`, `dayDate`). Beide mit `mvcc-enabled="false"` und `remote-service="false"`. Das Skript
   „Schutz in der Datenhaltung“ bekommt die Fremdschlüssel (`traineeId` → `BH_Person` und `weeklyReportId` →
   `BH_WeeklyReport`, je `ON DELETE CASCADE`), den CHECK **`weekly_report_iso_week_range`** (Woche 1 bis 52, die 53 nur in Jahren mit
   53 Wochen, wie die Migration `20261012100000_kw53_nur_in_langen_jahren`), die CHECK-Constraints auf `status` und `dayType` (feste
   Werte) und auf das Datumsformat von `dayDate`. Der Trigger `report_day_locked` kommt erst mit P05. `buildService`, Datenbank
   `berichtsheft_l72` neu anlegen, Bundle neu starten. Prüfschritt: erzeugte `tables.sql` gegen gemeinsam 2.3; ein direktes
   `INSERT` einer zweiten Zeile für denselben Azubi und dieselbe Woche sowie einer KW 53/2027 scheitert in PostgreSQL.
3. **Fachfunktionen** `de.berichtsheft.domain.reports` in `bh-domain` (M03-R01 bis M03-R16, Java 8, nur `java.time`, „jetzt“ als
   Parameter): `ReportGeneration.dueWeeks(beginn, ende, now)` (AK-301, AK-302, AK-303, AK-304: von der Woche des Beginns bis zur
   aktuellen Woche, höchstens bis zur Woche des Endes; aktuelle Woche nach Europe/Berlin über P01),
   `planReportDays(woche, beginn, ende, bundesland)` mit `PlannedDay` (fünf Tage Mo–Fr, außerhalb markiert, Feiertag nur innerhalb
   der Ausbildung als Tagesart `HOLIDAY` vorbelegt und mit `holidayPreset` gemerkt; AK-305), `isOutsideTraining()`,
   `correctOutsideTraining(tage, beginn, ende, bundesland)` (nur geänderte Tage; eine eingetragene Tagesart bleibt; AK-305),
   `isWeekOutsideTraining()`, `classifyWeek()` (ausgeblendet, außerhalb, offen, vergangen offen; AK-306) und `isPastOpen()`. Der
   Begriff „offener Status“ (Entwurf oder Abgelehnt, M03-R14) steht als `ReportStatus.isOpen()`; das übrige Statusmodell folgt in
   P05. Fehler der Eingaben als `InvalidIsoWeekException` und `UnknownFederalStateException` (P01). Prüfschritt: JUnit-Tests
   `AK301_…` bis `AK306_…` in `bh-domain`.
4. **Fachlogik-Adapter** für `faelligeWochen`, `berichtstageAnlegen`, `ausserhalbNeuBerechnen`, `istOffen` und `wocheEinordnen`
   (Formate nach `specs/pruefung/format.md`: Status `Entwurf` … `Abgelehnt`, Tagesart `Betrieb` … `Feiertag` oder `null`). Fälle mit
   `uhr` stellen die Uhr des Adapters. Prüfschritt: `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M03` meldet 38 grüne
   Fälle und AK-305-09 als „noch nicht gebaut“, keinen roten.
5. **Anlegen** in `WeeklyReportLocalServiceImpl` (M03-R01 bis M03-R13, AK-301 bis AK-305, AK-205, AK-203): `ensureReportsForTrainee(
   long actorUserId, long traineeId)` prüft Rolle und Besitz selbst (der Azubi für sich, ein aktiver Ausbilder für jeden Azubi,
   sonst `zugriff_verweigert`); `ensureReportsForAllTrainees()` ohne Handelnden ruft nur der Scheduler und die Personenverwaltung
   (gleiches Modul), kein MVC-Command. Ablauf je Azubi in **einer** Transaktion: Ausbildungszeitraum und bei Bedarf Bundesland
   lesen, `dueWeeks()`, je Woche den Bericht mit `INSERT … ON CONFLICT (traineeId, isoYear, isoWeek) DO NOTHING` über
   `SQLQuery.executeUpdate()` anlegen (Kennungen aus dem Zähler `CounterLocalService`); nur wenn eine Zeile entstand, die fünf Tage
   aus `planReportDays()` einfügen, sonst fehlende Tage ergänzen (`ON CONFLICT (weeklyReportId, dayDate) DO NOTHING`; M03-R07,
   vorhandene Tage und Inhalte bleiben). Grund für `ON CONFLICT`: Eine Unique-Verletzung würde die PostgreSQL-Transaktion
   abbrechen; wiederholtes und gleichzeitiges Anlegen müssen ohne Wirkung und ohne Ausnahme enden. Danach den Finder-Cache beider
   Entities leeren (Profil, Abschnitt 7). Für **deaktivierte Azubis** entstehen keine neuen Berichte (M03-R06): `ensureReportsForAllTrainees()`
   nimmt nur `getActiveTrainees()` aus P02. Nach einer Änderung des Ausbildungszeitraums (P02, `updatePerson`) ruft die
   Personenverwaltung `correctOutsideTraining()` auf **offene** Berichte (auch für Wochen ganz außerhalb) und `ensureReports…`; Tage mit
   Inhalt, eingereichte und freigegebene Berichte bleiben (M03-R11 bis M03-R13); gelöscht wird nichts. Vorbelegte Feiertage werden
   nie neu berechnet (M03-R10). Prüfschritt: `WeekGenerationTest.AK301_berichtUndTageEntstehenZusammen`,
   `WeekGenerationTest.AK304_zweiGleichzeitigeLaeufeErzeugenKeineDoppelten` (zwei Threads, `CountDownLatch`; genau ein Bericht und
   fünf Tage), `WeekGenerationTest.AK205_deaktivierterAzubiBekommtKeineNeuenWochen`.
6. **Übersichten** (M03-R14 bis M03-R17, AK-306): `getTraineeWeeks(long actorUserId, long traineeId)` (Wochen neueste zuerst,
   eingeordnet durch `classifyWeek()`, ausgeblendete fehlen; Azubi nur eigene, Ausbilder jeden Azubi lesend, ein deaktivierter
   Azubi bleibt lesbar) und `getTraineesWithProgress(long actorUserId)` (je Azubi Wochen, freigegebene und vergangen offene Wochen,
   letzte Einreichung; nur Ausbilder). Die Daten kommen aus Custom SQL (`WeeklyReportFinderImpl`, `META-INF/custom-sql/default.xml`);
   `inhalt` heißt: mindestens ein Tag hat eine Tagesart oder einen Text. `historie` (mindestens ein Statuswechsel) liefert bis P05
   ein Platzhalter-Finder mit „nein“ und einem Test, den P05 scharfstellt (die Tabelle `BH_StatusChange` entsteht dort); siehe
   „Bitte bestätigen“. Ausgeblendet wird nur in der Anzeige. Prüfschritt: `OverviewAccessTest.AK306_azubiSiehtNurDieEigeneUebersicht`
   (Anna liest die Übersicht eines zweiten, nur im Test angelegten Azubis: `zugriff_verweigert`) und `OverviewAccessTest.AK306_ausbilderSiehtDieUebersichtLesend`
   (Bernd und Clara sehen Annas Liste, die Zahl der vergangen offenen Wochen stimmt bei festgestellter Uhr).
7. **Scheduler-Lauf** im Modul `bh-notification` (Profil 3.3): `WeekGenerationMessageListener` (`MessageListener`) mit
   `SchedulerEngineHelper.register(…)`, `TriggerFactory` im Takt von 15 Minuten, `StorageType.MEMORY_CLUSTERED`. Der Lauf ruft
   `ensureReportsForAllTrainees()`; weil das Anlegen wiederholbar ist, braucht er keinen Vermerk. Die Cron-Zeit ist nie Berliner
   Zeit; „Montag 0:00 Uhr Berlin“ entscheidet `dueWeeks()` mit der Uhr (Profil 3.3). Beim Aufruf der Übersicht und der
   Startseite des Azubis läuft zusätzlich `ensureReportsForTrainee()` (M03-R02: spätestens dann). Prüfschritt:
   `WeekGenerationJobTest.AK302_neueWocheEntstehtMitDemLauf` (Uhr auf Sonntag 11.10.2026, 23:59 Uhr Berlin: kein Bericht für KW 42; auf
   Montag 12.10.2026, 0:00 Uhr: Lauf legt KW 42 an) und `WeekGenerationJobTest.AK302_schedulerEintragIstRegistriert` (der Eintrag steht
   mit 15-Minuten-Takt in `SchedulerEngineHelper`; Methoden bestätigt P00).
8. **Portlets (funktional)** in `bh-web`, Gestaltung folgt in P09: Start des Azubis (aktuelle Woche mit Merker `data-woche`, „Zu
   erledigen“), „Meine Wochen“ (Kacheln, vergangen offene hervorgehoben, Wochen ganz außerhalb markiert) und, für Ausbilder, Liste der
   Azubis mit Zahl der vergangen offenen Wochen und Übersicht je Azubi (nur lesend). Es gibt **keinen** MVC-Command und keine
   Oberfläche zum Anlegen eines Berichts (AK-304); jeder Command übergibt nur die `userId` an den Service. Prüfschritt: Anna und
   Bernd von Hand in Chromium: Annas Wochen KW 36 bis zur aktuellen Woche, Bernd sieht dieselbe Liste ohne Bearbeiten.
9. **Plattformeigene Tests zur Datenhaltung** (`ReportConstraintsTest`, Arquillian in `bh-test-integration`):
   `AK304_datenhaltungWeistDoppelteAb` (direktes JDBC-`INSERT` einer zweiten Zeile für Azubi und Woche scheitert),
   `AK304_datenhaltungWeistWocheAusserhalbAb` (KW 53/2027 und KW 0 scheitern am CHECK `weekly_report_iso_week_range`, KW 53/2026
   gelingt) und `AK305_datenhaltungKenntFuenfTageJeBerichtGenau` (zweiter Tag mit demselben Datum scheitert). Prüfschritt: grün.
10. **Testschnittstelle und Bau-Stand.** `bh-pruefung` bekommt die Aktion „Berichte anlegen“ (Aufruf von
    `ensureReportsForAllTrainees()` bei gestellter Uhr), damit Ablauf-Fälle späterer Module Berichte vorfinden; in Produktion
    antwortet sie nicht (P00, Schritt 13). M03 in die Bau-Liste eintragen; AK-305-09 bleibt zurückgestellt bis P04.
11. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P03-1 „Ende wird ignoriert“ (AK-303) | `dueWeeks()` ignoriert `ende` | AK-303-01, AK-303-04 | AK-303-02, AK-303-03: dort liegt das Ende nicht vor der aktuellen Woche |
    | F-P03-2 „Zukünftiger Beginn ergibt Bericht“ (AK-302) | `dueWeeks()` nimmt bei Beginn nach heute die Woche des Beginns | AK-302-03, AK-302-04 | AK-301-01 bis AK-301-03 |
    | F-P03-3 „Wochenwechsel in UTC“ (AK-302) | `dueWeeks()` bestimmt die aktuelle Woche aus dem UTC-Tag | AK-302-02 | AK-302-01: Sonntag 23:59 Uhr Berlin ist auch in UTC noch Sonntag |
    | F-P03-4 „Feiertag außerhalb vorbelegt“ (AK-305) | `planReportDays()` belegt Feiertage auch außerhalb der Ausbildung vor | AK-305-04 | AK-305-03, AK-305-05: dort liegt der Feiertag innerhalb bzw. nur Nicht-Feiertage außerhalb |
    | F-P03-5 „Eingetragene Tagesart überschrieben“ (AK-305) | `correctOutsideTraining()` setzt „Feiertag“ auch bei vorhandener Tagesart | AK-305-08 | AK-305-06, AK-305-07 |
    | F-P03-6 „Woche ganz außerhalb zählt als offen“ (AK-306) | `classifyWeek()` prüft den offenen Status, aber nicht die Lage der Woche | AK-306-11, AK-306-12, AK-306-13, AK-306-16 | AK-306-17 (Status Eingereicht ist ohnehin nicht offen), AK-306-14 |
    | F-P03-7 „Ausgeblendet ohne Inhalt und Historie“ (AK-306) | `classifyWeek()` blendet jede Woche ganz außerhalb aus | AK-306-12, AK-306-13, AK-306-17 | AK-306-11, AK-306-16: dort ist der Bericht unberührt |
    | F-P03-8 „Eindeutigkeit fehlt“ (AK-304) | den eindeutigen Index auf (`traineeId`, `isoYear`, `isoWeek`) in der Testdatenbank entfernen | `ReportConstraintsTest.AK304_datenhaltungWeistDoppelteAb` und `WeekGenerationTest.AK304_zweiGleichzeitigeLaeufeErzeugenKeineDoppelten` (ohne passenden Index scheitert `ON CONFLICT`) | alle Prüffälle: sie laufen durch die Fachlogik, kein neutraler Fall prüft die Datenhaltung |
    | F-P03-9 „Wochen-CHECK zu weit“ (AK-304) | `weekly_report_iso_week_range` erlaubt 1 bis 53 für jedes Jahr | `ReportConstraintsTest.AK304_datenhaltungWeistWocheAusserhalbAb` (KW 53/2027) | AK-1204-01 bis AK-1204-06 (reine Fachlogik aus P01) |
    | F-P03-10 „Bericht ohne Tage“ (AK-301) | die Tage in einer eigenen Transaktion (`REQUIRES_NEW`) einfügen und danach absichtlich werfen | `WeekGenerationTest.AK301_berichtUndTageEntstehenZusammen` (ein Bericht ohne fünf Tage bleibt zurück) | AK-301-01 bis AK-301-03 (Fachlogik) |
    | F-P03-11 „Deaktivierte Azubis erhalten Wochen“ (AK-205) | `ensureReportsForAllTrainees()` nimmt alle statt nur aktive Azubis | `WeekGenerationTest.AK205_deaktivierterAzubiBekommtKeineNeuenWochen` | alle Prüffälle von M03 |
    | F-P03-12 „Lauf legt nichts an“ (AK-302) | `WeekGenerationMessageListener.receive()` ruft `ensureReportsForAllTrainees()` nicht auf | `WeekGenerationJobTest.AK302_neueWocheEntstehtMitDemLauf` | AK-302-01 bis AK-302-04 (Fachlogik) |
    | F-P03-13 „Fremde Übersicht lesbar“ (AK-306) | `getTraineeWeeks()` prüft den Besitz nicht | `OverviewAccessTest.AK306_azubiSiehtNurDieEigeneUebersicht` | AK-306-01 bis AK-306-17 |

    Prüfschritt: dreizehn rote Läufe mit den benannten Fällen im PR notiert, danach alles grün.
12. **Bau-Stand abschließen.** Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M03` | 38 Fachlogik-Fälle grün, AK-305-09 „noch nicht gebaut“ (zurückgestellt), keiner rot |
| `./gradlew :modules:bh-domain:test` | JUnit-Tests `AK301_…` bis `AK306_…` grün; Systemzeit-Prüfung grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*WeekGenerationTest*' --tests '*WeekGenerationJobTest*' --tests '*ReportConstraintsTest*' --tests '*OverviewAccessTest*'` | grün (Anlegen, Gleichzeitigkeit, Scheduler, Datenhaltung, Zugriff) |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M03` | keine Daten-Fälle in M03 (0 Fälle), kein roter |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | Ablauf-Fälle der gebauten Module weiter grün (M03 hat keine eigenen) |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge. Im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L72-P03: Wochenberichte entstehen (Wochenerzeugung, Übersichten, Scheduler)“; vor dem Push `./gradlew build`, der
  Fachlogik-Adapter von M03 und die plattformeigenen Tests lokal grün.
- Draft-PR mit der AK-Tabelle (AK-301, AK-302, AK-303, AK-304, AK-305, AK-306 mit Test und Prüffällen), dem zurückgestellten Fall
  AK-305-09, den Gegenproben mit den roten Fällen und „Bitte bestätigen“. Geschützte Pfade: `service.xml`, `**/sql/**`,
  `**/custom-sql/**`, `**/service/persistence/impl/**`, `**/service/impl/**`, `**/upgrade/**` und `bh-pruefung` (gemeinsam 5);
  Chris mergt.
- Bericht an die Steuerung per `send_message`; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Doppelte Berichte bei gleichzeitigem Aufruf | Eindeutigkeit der Datenbank nutzen, nie erst lesen und dann schreiben (Schritt 5) |
| Transaktion bricht bei Unique-Verletzung ab („current transaction is aborted“) | `INSERT … ON CONFLICT DO NOTHING` statt `addWeeklyReport` mit Ausnahme |
| Bericht ohne Tage sichtbar | Bericht und Tage in derselben Transaktion; Gegenprobe F-P03-10 |
| Neu angelegter Bericht erscheint nicht in der Übersicht | Finder-Cache nach dem Anlegen am Service Builder vorbei leeren (Profil, Abschnitt 7) |
| Hinweis „Feiertag (vorbelegt)“ ändert sich nach Bundeslandwechsel | den gespeicherten Merker `holidayPreset` lesen, nicht `Holidays.isHoliday()` mit dem aktuellen Bundesland |
| KW 53 in der Datenhaltung akzeptiert | CHECK `weekly_report_iso_week_range` mit der genauen Regel (28. Dezember), nicht nur 1 bis 53 |
| Woche ganz außerhalb wird gezählt oder gespeichert | `classifyWeek()` rechnet aus dem aktuellen Zeitraum; gespeichert wird dazu nichts |
| Neue Woche erscheint erst Stunden nach Montag 0:00 Uhr | Scheduler läuft im festen Takt in UTC; „fällig“ entscheidet `dueWeeks()` mit der Uhr, nicht die Cron-Zeit (Profil 3.3) |
| Zeitraumänderung ändert eingereichte oder freigegebene Berichte | Neuberechnung nur für Berichte mit offenem Status |
| Tage um einen Tag verschoben | Kalendertage nur als `JJJJ-MM-TT` und `LocalDate`, JVM und JDBC in UTC (gemeinsam 2.2) |
