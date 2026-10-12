# Code-Landkarte

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G1) · @Chris

Unterspec für Weg A (`docs/06-spec-architektur.md`, „Code-Landkarte“): welche Dateien der TypeScript-App ein Modul
umsetzen, in welcher Reihenfolge sie zu lesen sind und was sich 1:1 übertragen lässt. Die Regeln selbst stehen in den
Fach-Specs (`specs/Mxx-*.md`).

`npm run landkarte` meldet Dateien unter `src/domain/` und `src/lib/`, die hier fehlen. In G1 ist das nur ein Bericht,
weil erst M01 beschrieben ist; ab Ende G2 ist es Pflicht in der CI (`npm run landkarte -- --pruefen`).

Spalten: **Plattformgebunden** = hängt an Next.js, Prisma, PostgreSQL oder einer Bibliothek, die es auf anderen
Plattformen nicht gibt. **Übertragung**: „1:1 übersetzen“ (Logik ohne Änderung nachbauen), „nach Profil neu bauen“
(Plattformmittel laut Profil), „ersetzt durch Bordmittel“ (Plattform hat es schon).

## M01 Kalender und Zeit

Fach-Spec: `specs/M01-kalender-und-zeit.md` · Prüffälle: `specs/pruefung/M01.json`

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/domain/clock.ts` → `now()`, `setFixedNow()`, `resetClock()`, `setClock()`, `fixedClock()` | einzige Quelle für „jetzt“, für Tests stellbar | M01-R01, M01-R02; AK-1201 | nein | 1:1 übersetzen (auf Liferay als eigener Uhr-Service, siehe unten) |
| `src/domain/clock.ts` → `clockFromEnvironment()` | `APP_FIXED_NOW` nur außerhalb von `NODE_ENV=production` | M01-R03; AK-1201 | ja (Umgebungsvariable, `NODE_ENV`) | nach Profil neu bauen (Konfiguration und Erkennung des Produktivbetriebs je Plattform) |
| `src/domain/clock.ts` → `InvalidInstantError` | unlesbarer Zeitpunkt | M01-R04; AK-1201 | nein | 1:1 übersetzen |
| `src/domain/weeks.ts` → `APP_TIME_ZONE`, `calendarDateIn()`, `today()` | Kalendertag in Europe/Berlin | M01-R05, M01-R06; AK-1202 | ja (`Intl.DateTimeFormat` mit Zeitzonen-Datenbank) | nach Profil neu bauen (Zeitzonen-API der Plattform) |
| `src/domain/weeks.ts` → `isoWeekOf()`, `isoWeekMonday()`, `isoWeeksInYear()`, `isValidIsoWeek()`, `isoWeekWorkdays()`, `nextIsoWeek()`, `compareWeeks()`, `currentIsoWeek()` | ISO-Wochen, Arbeitstage, Folgewoche, Vergleich, aktuelle Woche | M01-R07 bis M01-R12; AK-1202 bis AK-1204 | nein | 1:1 übersetzen |
| `src/domain/weeks.ts` → `InvalidIsoWeekError` | Woche, die es nicht gibt | M01-R12; AK-1204 | nein | 1:1 übersetzen |
| `src/domain/weeks.ts` → `formatDate()`, `toDateInput()`, `weekLabel()`, `weekRangeLabel()`, `weekRangeShort()`, `weekdayShort()`, `weekdayLong()` | Texte für Oberfläche und PDF | – (Anzeige, M07/M09) | nein | 1:1 übersetzen oder durch Formatierung der Plattform ersetzen |
| `src/domain/federal-states.ts` → `FEDERAL_STATES`, `isFederalState()`, `federalStateName()`, `UnknownFederalStateError` | die 16 Kürzel und Namen | M01-R13, M01-R14; AK-1205 | nein | 1:1 übersetzen |
| `src/domain/holidays.ts` → `publicHolidays()`, `isPublicHoliday()` | gesetzliche Feiertage je Bundesland und Jahr | M01-R15, M01-R17 bis M01-R19; AK-404, AK-1206 | ja (Bibliothek feiertagejs) | nach Profil neu bauen (Feiertagsbibliothek der Plattform oder eigene Berechnung), Prüffälle AK-404 und AK-1206 als Maßstab |
| `src/domain/holidays.ts` → `ONE_TIME_HOLIDAYS` und Korrektur Reformationstag vor 2018 | einmalige landesweite Feiertage, Ergänzung zu feiertagejs | M01-R15, M01-R16; AK-1206 | nein | 1:1 übersetzen (Referenzdaten aus der Fach-Spec, Abschnitt 5) |

**Einstieg:** zuerst `src/domain/clock.ts` (klein, alle anderen Module hängen daran), dann `src/domain/weeks.ts` (Wochen
und Zeitzone), dann `federal-states.ts` und `holidays.ts`. Aufgerufen werden die Funktionen vor allem aus
`src/domain/report-generation.ts` (M03) und `src/domain/notifications.ts` (M08).

**Belege:**

- Vitest: `src/domain/clock.test.ts` (AK-1201), `src/domain/weeks.test.ts` (AK-1202 bis AK-1204),
  `src/domain/federal-states.test.ts` (AK-1205, AK-209), `src/domain/holidays.test.ts` (AK-404, AK-1205, AK-1206),
  `src/domain/report-generation.test.ts` (AK-404 beim Anlegen, AK-301 bis AK-304 mit den Wochenfunktionen).
- Prüf-Runner: `tests/pruefung/fachlogik.test.ts` mit `tests/pruefung/adapter.ts` führt `specs/pruefung/M01.json` aus.
- Playwright: `e2e/ak-301-408-berichte-erfassen.spec.ts` und `e2e/ui-ak.spec.ts` nutzen `currentIsoWeek()` und die
  feste Uhr (`APP_FIXED_NOW`) im Browser-Test.

**Fallen:**

- „Jetzt“ nur aus dem Uhr-Modul (`now()`), nie `new Date()` in Fachlogik; Fachfunktionen bekommen „jetzt“ als Parameter.
- Kalendertage sind `Date` auf UTC-Mitternacht und werden nur mit `getUTC…()` gelesen. Lokale Getter verschieben den Tag,
  sobald der Server nicht in UTC läuft.
- Datenbankverbindungen laufen fest in UTC (`createPrismaClient` in `src/lib/db.ts`), sonst liest `@prisma/adapter-pg`
  `timestamptz` bei einem Server in Europe/Berlin verschoben.
- `APP_FIXED_NOW` wirkt nur außerhalb von `NODE_ENV=production`; `setFixedNow()` rufen nur Tests auf. Im Runner und in
  Tests nach jedem Fall `resetClock()`.
- `isoWeekMonday()` und alles darauf (`isoWeekWorkdays()`, `weekLabel()`, `nextIsoWeek()` …) werfen bei einer Woche,
  die es nicht gibt (`InvalidIsoWeekError`). Wochen kommen heute nur aus der Datenbank oder aus `isoWeekOf()`, nie aus
  der URL.
- Feiertage werden beim Anlegen eines Berichts vorbelegt (`planReportDays()` in M03) und später nicht neu berechnet;
  eine Änderung des Bundeslands oder der Feiertagsliste ändert bestehende Berichte nicht.
- `weeks.ts` importiert nichts aus anderen Modulen; `report-generation.ts` (M03) importiert aus `weeks.ts`, nie
  umgekehrt (keine zirkulären Importe).

**Ersetzt durch Bordmittel:** Auf Liferay wird die Uhr ein eigener Service der App (stellbar nur außerhalb des
Produktivbetriebs), Zeitzone und Wochen kommen aus `java.time` bzw. der Kalender-API der Plattform. Die Einzelheiten
legt das Profil fest (G4).

## M03 Wochenberichte entstehen

Fach-Spec: `specs/M03-wochenberichte-entstehen.md` · Prüffälle: `specs/pruefung/M03.json`

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/domain/report-generation.ts` → `weeksDue()` | fällige Wochen von Beginn bis heute, höchstens bis zum Ende | M03-R01 bis M03-R04; AK-301 bis AK-304 | nein | 1:1 übersetzen |
| `src/domain/report-generation.ts` → `isOutsideTraining()`, `planReportDays()`, `PlannedDay` | fünf Tage Mo–Fr eines neuen Berichts, „außerhalb“ markiert, Feiertage vorbelegt und gemerkt (`holidayPreset`) | M03-R07 bis M03-R09; AK-305, AK-401 (Kern), AK-404 beim Anlegen | nein | 1:1 übersetzen |
| `src/domain/report-generation.ts` → `correctOutsideTraining()`, `StoredDay`, `DayCorrection` | Markierung nach geändertem Ausbildungszeitraum neu berechnen, neu einbezogene Feiertage vorbelegen | M03-R11, M03-R12; AK-305, AK-203 (M02) | nein | 1:1 übersetzen |
| `src/domain/report-generation.ts` → `isWeekOutsideTraining()`, `classifyWeek()`, `isPastOpen()`, `WeekForOverview`, `WeekClassification` | Woche ganz außerhalb, ausgeblendet, offen, vergangen offen | M03-R14 bis M03-R16; AK-306 | nein | 1:1 übersetzen |
| `src/domain/report-generation.ts` → `TrainingPeriod`, `DayType`, Weiterreichen von `OPEN_STATUSES` | gemeinsame Typen; Definition „offener Status“ liegt in `report-status.ts` (`OPEN_STATUSES`, `isOpenStatus()`, Datei von M05) | M03-R14 | nein | 1:1 übersetzen |
| `src/lib/reports.ts` → `ensureReportsForTrainee()`, `ensureReportsForAllTrainees()`, `GenerationResult` | Berichte und fehlende Tage anlegen, Zeitraumänderung nachziehen; eine Transaktion, Eindeutigkeit durch die Datenbank | M03-R01 bis M03-R13; AK-301 bis AK-305, AK-203, AK-205 | ja (Prisma, PostgreSQL) | nach Profil neu bauen |
| `src/lib/reports.ts` → `listTraineeWeeks()` | Übersicht eines Azubis: Wochen neueste zuerst, eingeordnet, ausgeblendete fehlen; Zugriff Azubi/Ausbilder | M03-R16, M03-R17; AK-306 | ja (Prisma) | nach Profil neu bauen |
| `src/lib/trainee-overview.ts` → `listTraineesWithProgress()` | je Azubi Wochen, freigegebene und vergangen offene Wochen, letzte Einreichung (Start Ausbilder, Liste „Azubis“) | M03-R17; AK-306 | ja (Prisma) | nach Profil neu bauen |
| `prisma/schema.prisma` → `WeeklyReport` (`@@unique([traineeId, isoYear, isoWeek])`), `ReportDay` (`@@unique([reportId, date])`, `holidayPreset`); Migrationen `…_init` (Prüfung der Wochennummer) und `20261012100000_kw53_nur_in_langen_jahren` | Eindeutigkeit je Azubi und Woche, gültige Wochen, Merker „vorbelegt“ | M03-R04, M03-R05, M03-R10; AK-304, AK-1204 | ja (Prisma, PostgreSQL) | nach Profil neu bauen |

**Einstieg:** zuerst `src/domain/report-generation.ts` von oben nach unten (`weeksDue()` → `planReportDays()` →
`correctOutsideTraining()` → `classifyWeek()`), dann `ensureReportsForTrainee()` und `listTraineeWeeks()` in
`src/lib/reports.ts`. Aufgerufen wird das Anlegen beim Aufruf der Seiten von Azubi und Ausbilder
(`src/app/(app)/azubi/…`, `src/app/(app)/ausbilder/…`), nach Änderungen in der Nutzerverwaltung, vor PDF-Export und
Erinnerung sowie täglich im Worker (`src/worker/index.ts`).

**Belege:**

- Vitest: `src/domain/report-generation.test.ts` (AK-301 bis AK-306, AK-404, AK-203), `tests/db/reports.test.ts`
  (AK-301 bis AK-306, AK-404 mit Merker „vorbelegt“, AK-1204 KW 53 in der Datenbank, AK-203, AK-205),
  `src/domain/notifications.test.ts` (AK-306: Wochen ganz außerhalb zählen nicht für die Erinnerung).
- Prüf-Runner: `tests/pruefung/fachlogik.test.ts` mit `tests/pruefung/adapter.ts` führt `specs/pruefung/M03.json` aus.
- Playwright: `e2e/ak-301-408-berichte-erfassen.spec.ts` (Übersicht, Hervorhebung, Ausbilder-Sicht, Tage außerhalb).

**Fallen:**

- „Jetzt“ übergibt der Aufrufer aus `now()` (M01); `weeksDue()` und `classifyWeek()` bestimmen die aktuelle Woche nach
  Europe/Berlin.
- `ensureReportsForTrainee()` ist idempotent und verlässt sich auf die Eindeutigkeit in der Datenbank
  (`createMany(…, skipDuplicates)`); eine Plattform ohne diese Eindeutigkeit erzeugt bei gleichzeitigem Aufruf
  Doppelte.
- Die Wochennummer prüft die Datenbank seit G2 genau (KW 53 nur in Jahren mit 53 Wochen); vorher nur 1 bis 53.
- Vorbelegte Feiertage werden nie neu berechnet. Der Hinweis „Feiertag (vorbelegt)“ liest den gespeicherten Merker
  `holidayPreset`, nicht `isPublicHoliday()` mit dem aktuellen Bundesland.
- Die Neuberechnung nach Zeitraumänderung läuft nur in Berichten mit offenem Status (`OPEN_STATUSES`), aber auch für
  Wochen ganz außerhalb; ausgeblendet wird nur in der Anzeige (`listTraineeWeeks()`), gelöscht wird nichts.
- `classifyWeek()` rechnet „ganz außerhalb“ aus dem aktuellen Zeitraum; es wird nichts dazu gespeichert.
- `src/lib/reports.ts` enthält außerdem Teile von M04 (Speichern), M05 (`listReviewQueue()`, `rejectionTexts()`) und
  M06 (`loadReportHistory()`); `listVisibleReports()` gehört zu M02 (Sichtbarkeit nach AK-103, AK-105).

**Ersetzt durch Bordmittel:** Den täglichen Lauf übernimmt auf Liferay der Zeitplaner der Plattform; Eindeutigkeit und
Prüfung der Wochennummer die Datenhaltung des Profils. Die Regeln in `report-generation.ts` werden 1:1 übersetzt (G4).

## M04 Bericht erfassen

Fach-Spec: `specs/M04-bericht-erfassen.md` · Prüffälle: `specs/pruefung/M04.json`

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/domain/report-days.ts` → `DAY_TYPES`, `DAY_TYPE_LABELS`, `isDayType()` | genau fünf Tagesarten in fester Reihenfolge | M04-R02; AK-402 | nein | 1:1 übersetzen |
| `src/domain/report-days.ts` → `MAX_ACTIVITIES_LENGTH`, `normalizeActivities()`, `activitiesLength()`, `activitiesError()` | Text unverändert bis auf Zeilenumbrüche, Länge in Unicode-Zeichen, Meldung „um n kürzen“ | M04-R09, M04-R10; AK-407 | nein | 1:1 übersetzen |
| `src/domain/report-days.ts` → `validateDayInputs()`, `EditableDay`, `DayInput`, `DayUpdate`, `DayErrors` | Eingaben aller Tage prüfen: nicht mitgeschickt bleibt, leer erlaubt, Tage außerhalb unverändert, alle Fehler je Tag | M04-R04, M04-R06 bis M04-R11; AK-402, AK-405 bis AK-407, AK-305 | nein | 1:1 übersetzen |
| `src/lib/reports.ts` → `saveReportDays()`, `SaveResult`, `dayInputsFromForm()` | Speichern mit Sperre des Berichts (`FOR UPDATE`), Rechte- und Statusprüfung (`canEditReport()`, M05) | M04-R06, M04-R12; AK-406, AK-204 | ja (Prisma, PostgreSQL, Formularfelder) | nach Profil neu bauen |

**Einstieg:** zuerst `src/domain/report-days.ts` (klein, alle Regeln zum Speichern), dann `saveReportDays()` in
`src/lib/reports.ts`. Die Oberfläche dazu (nicht in der Landkarte, M09): `src/app/(app)/berichte/[id]/ReportEditor.tsx`
(Formular, Zeichenzähler, Warnung beim Verlassen nach AK-408), `ReportView.tsx` (lädt den Bericht, reicht den Merker
„vorbelegt“ weiter), `actions.ts` (Serveraktion `saveReportAction`) und `src/components/ui/day-type.tsx` (Auswahl
Tagesart mit „Feiertag (vorbelegt)“).

**Belege:**

- Vitest: `src/domain/report-days.test.ts` (AK-402, AK-405 bis AK-407, AK-305), `tests/db/reports.test.ts` (AK-405 bis
  AK-407, AK-305, AK-103, AK-204 beim Speichern).
- Prüf-Runner: `tests/pruefung/fachlogik.test.ts` mit `tests/pruefung/adapter.ts` führt `specs/pruefung/M04.json` aus.
- Playwright: `e2e/ak-301-408-berichte-erfassen.spec.ts` (AK-401 bis AK-403 Anzeige, AK-404 Hinweis „vorbelegt“ nach
  Bundeslandwechsel, AK-405 bis AK-408).

**Fallen:**

- Browser senden Textfelder mit `\r\n`; gespeichert wird `\n`. Die Länge zählt `Array.from()` (Unicode-Zeichen), nicht
  `String.length`: ein Emoji ist ein Zeichen.
- Ein Feld, das nicht im Formular steht (`null`), bleibt unverändert; ein leeres Feld (`""`) leert die Tagesart.
- Tage außerhalb der Ausbildung werden still übergangen, nicht abgewiesen.
- `saveReportDays()` sperrt den Bericht mit `SELECT … FOR UPDATE`, damit ein gleichzeitiger Statuswechsel
  (`report-transitions.ts`, M05) nicht übergangen wird.
- Der Hinweis „Feiertag (vorbelegt)“ kommt aus `ReportDay.holidayPreset` (M03), nicht aus dem aktuellen Bundesland.

**Ersetzt durch Bordmittel:** Formular, Fehlermeldungen am Feld und die Warnung beim Verlassen baut eine Plattform mit
ihren eigenen Mitteln nach (M09, Profil); die Regeln in `report-days.ts` werden 1:1 übersetzt.
