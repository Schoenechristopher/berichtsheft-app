# Code-Landkarte

Stand: 13.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Unterspec für Weg A (`docs/06-spec-architektur.md`, „Code-Landkarte“): welche Dateien der TypeScript-App ein Modul
umsetzen, in welcher Reihenfolge sie zu lesen sind und was sich 1:1 übertragen lässt. Die Regeln selbst stehen in den
Fach-Specs (`specs/Mxx-*.md`).

`npm run landkarte` meldet Dateien unter `src/domain/` und `src/lib/`, die hier fehlen. Seit Ende G2 ist das Pflicht in
der CI (`npm run landkarte -- --pruefen`): Jede dieser Dateien steht in einem Modulabschnitt oder im „Querschnitt“.

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

## M02 Personen und Zugang

Fach-Spec: `specs/M02-personen-und-zugang.md` · Prüffälle: `specs/pruefung/M02.json`

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/domain/access.ts` → `decideAccess()`, `NO_ACCESS_MESSAGE` | Zugang nur für angelegte, aktive Personen | M02-R03; AK-102 | nein | 1:1 übersetzen |
| `src/domain/access.ts` → `matchLogin()` | Zuordnung beim Login: zuerst Konto-ID, sonst einmaliges Binden über die bestätigte E-Mail | M02-R07, M02-R08; AK-201, AK-102 | nein | 1:1 übersetzen (auf Liferay ersetzt durch Bordmittel, siehe unten) |
| `src/domain/access.ts` → `extractAccountId()`, `extractLoginClaims()`, `ClaimNames` | Konto-ID und bestätigte E-Mail aus den Claims des Identity Providers (Keycloak `sub`/`email_verified`, Entra ID `oid`/`xms_edov`) | M02-R07, M02-R08; AK-201 | ja (OIDC-Claims) | ersetzt durch Bordmittel |
| `src/domain/access.ts` → `homePathFor()`, `roleLabel()`, `Role` | Startseite und Bezeichnung je Rolle | M02-R01; Anzeige (M09) | nein | 1:1 übersetzen oder durch Plattform ersetzen |
| `src/domain/access.ts` → `RETURN_PARAM`, `safeReturnPath()` | Rücksprungziel nach der Anmeldung, nur Pfade innerhalb der App | AK-1003 (gehört M08) | nein | 1:1 übersetzen |
| `src/domain/people.ts` → `validatePerson()`, `normalizeEmail()`, `isValidDate()`, `FIELD_LABELS` | Formulardaten einer Person prüfen; Meldung je Feld | M02-R06, M02-R14 bis M02-R17; AK-201 bis AK-203 | nein | 1:1 übersetzen |
| `src/domain/people.ts` → `checkUpdate()` | Rollenwechsel: letzter Ausbilder, zugeordnete Azubis, eigene Rolle | M02-R18, M02-R23 bis M02-R26; AK-203, AK-207, AK-208 | nein | 1:1 übersetzen |
| `src/domain/people.ts` → `checkDeactivate()`, `checkReactivate()`, `isLastActiveTrainer()`, `assignedTrainees()` | Deaktivieren und wieder aktivieren | M02-R19, M02-R20, M02-R23 bis M02-R26; AK-204, AK-207, AK-208 | nein | 1:1 übersetzen |
| `src/domain/people.ts` → `checkDelete()`, `confirmsName()`, `foreignHistoryMessage()` | Endgültig löschen, Namensbestätigung, fremde Historie | M02-R21 bis M02-R26; AK-206 bis AK-208 | nein | 1:1 übersetzen |
| `src/domain/people.ts` → `RuleReason`, `RuleResult` | Ablehnungsgrund unabhängig vom Meldungstext (Fehlercodes der Prüffälle) | M02-R19 bis M02-R26 | nein | 1:1 übersetzen |
| `src/domain/people.ts` → `checkFederalStateSetting()` | Bundesland der Firma: nur Admin, nur eines der 16 | M02-R28; AK-209 | nein | 1:1 übersetzen |
| `src/domain/report-access.ts` → `canViewReport()`, `Viewer`, `ACCESS_DENIED_MESSAGE` | wer welchen Bericht sieht | M02-R09 bis M02-R11; AK-103, AK-105, AK-204 | nein | 1:1 übersetzen |
| `src/domain/report-access.ts` → `canManagePeople()` | Prüf- und Admin-Funktionen nur für aktive Ausbilder | M02-R12; AK-104, AK-209 | nein | 1:1 übersetzen |
| `src/lib/people/service.ts` → `createPerson()`, `updatePerson()`, `deactivatePerson()`, `reactivatePerson()`, `deletePerson()`, `updateFederalState()` | Serveraktionen: Rolle prüfen, Personenstand laden, Regel aus `people.ts` anwenden, serialisierbar schreiben (bis zu fünf Versuche) | M02-R13, M02-R27; AK-201 bis AK-209 | ja (Prisma, PostgreSQL) | nach Profil neu bauen |
| `src/lib/people/service.ts` → `hasForeignHistory()` | Statuswechsel oder Kommentare an fremden Berichten zählen | M02-R22; AK-206 | ja (Prisma) | nach Profil neu bauen (Abfrage an M06) |
| `src/lib/people/service.ts` → `getFederalState()`, `listPeople()`, `listActiveTrainees()` | Abfragen: Bundesland (Voreinstellung NW), Personenliste, aktive Azubis für M03 und M08 | M02-R28; AK-205, AK-209 | ja (Prisma) | nach Profil neu bauen |
| `src/lib/people/service.ts` → `updateOwnTheme()` | eigene Darstellung speichern | UI-AK-14 (gehört M09) | ja (Prisma) | nach Profil neu bauen |
| `src/lib/people/labels.ts` → `trainingPeriod()`, `SUCCESS_MESSAGES` | Anzeige-Texte der Nutzerverwaltung | – (Anzeige, M09) | nein | 1:1 übersetzen oder durch Plattform ersetzen |
| `src/lib/auth/config.ts` → `oidcConfig()`, `testLoginEnabled()`, `toInternalUrl()`, `SESSION_MAX_AGE_SECONDS` | Anmeldung aus Umgebungsvariablen; Test-Login nie in Produktion; Sitzung 8 Stunden | M02-R02, M02-R05; AK-101, AK-201, AK-204 | ja (Auth.js, OIDC, Umgebungsvariablen) | ersetzt durch Bordmittel |
| `src/lib/auth/login.ts` → `resolveLoginPerson()` | Person zur Konto-ID bzw. E-Mail suchen und beim ersten Login bedingt binden | M02-R07, M02-R08; AK-201, AK-102 | ja (Prisma) | nach Profil neu bauen bzw. ersetzt durch Bordmittel |
| `src/lib/auth/logout.ts` → `logout()`, `switchAccount()` | Abmelden in der App und beim Identity Provider (RP-initiated Logout) | M02-R05; AK-106, AK-102 | ja (Auth.js, Next.js, OIDC) | ersetzt durch Bordmittel |
| `src/lib/session.ts` → `getCurrentPerson()`, `requirePerson()` | jede Anfrage prüft Person und Rolle gegen die Datenbank; ohne Sitzung zur Anmeldung, ohne Zugang zum Hinweis, falsche Rolle zur eigenen Startseite | M02-R04, M02-R12, M02-R13; AK-102, AK-104, AK-1003 | ja (Next.js, Auth.js) | nach Profil neu bauen |
| `src/auth.ts` → `authConfig`, Callbacks `signIn`, `jwt`, `session` (außerhalb von `src/lib/`) | Provider, Test-Login, Bindung beim ersten Login, Sitzung als JWT | M02-R02 bis M02-R05, M02-R07, M02-R08; AK-101, AK-102, AK-201 | ja (Auth.js) | ersetzt durch Bordmittel |
| `src/proxy.ts` → `proxy()` (außerhalb von `src/lib/`) | gibt den aufgerufenen Pfad als Rücksprungziel weiter | AK-1003 (gehört M08) | ja (Next.js) | nach Profil neu bauen |

**Einstieg:** zuerst `src/domain/access.ts` (Zugang und Zuordnung beim Login, klein), dann `src/domain/people.ts`
(alle Regeln der Nutzerverwaltung als reine Funktionen) und `canViewReport()`/`canManagePeople()` in
`src/domain/report-access.ts`. Danach `src/lib/people/service.ts` (wie jede Aktion Rolle prüft, den Stand lädt und die
Regel anwendet) und zuletzt der Plattformteil: `src/auth.ts`, `src/lib/auth/`, `src/lib/session.ts`.

**Belege:**

- Vitest: `src/domain/access.test.ts` (AK-102, AK-201, AK-1003), `src/domain/people.test.ts` (AK-201 bis AK-204,
  AK-206 bis AK-209), `src/domain/report-access.test.ts` (AK-102 bis AK-105, AK-204), `src/lib/auth/config.test.ts`
  (AK-201, AK-204 Sitzung 8 Stunden).
- Datenbank: `tests/db/people.test.ts` (AK-102 bis AK-105, AK-201 bis AK-209, gleichzeitiges Deaktivieren bei AK-207).
- Prüf-Runner: `tests/pruefung/fachlogik.test.ts` mit `tests/pruefung/adapter.ts` (Block „M02 Personen und Zugang“)
  führt `specs/pruefung/M02.json` aus.
- Playwright: `e2e/ak-101-anmeldung.spec.ts`, `e2e/ak-102-kein-zugang.spec.ts`, `e2e/ak-103-105-berichte.spec.ts`,
  `e2e/ak-104-admin-gesperrt.spec.ts`, `e2e/ak-106-abmelden.spec.ts`, `e2e/ak-201-209-nutzerverwaltung.spec.ts`,
  `e2e/produktionsmodus.spec.ts` (kein Test-Login im Produktionsmodus).

**Fallen:**

- `src/auth.ts`, `src/proxy.ts`, `src/lib/auth/`, `src/domain/access.ts` und `src/domain/report-access.ts` sind
  geschützte Pfade (AM-R04): Änderungen gibt immer Chris frei.
- Jede Serveraktion ruft selbst `canManagePeople()` bzw. `canViewReport()` auf; ausgeblendete Schaltflächen schützen
  nichts. Neue Aktionen nie ohne diese Prüfung.
- Der Personenstand wird innerhalb der serialisierbaren Transaktion gelesen, nicht vorher: Nur so lassen zwei
  gleichzeitige Deaktivierungen den letzten aktiven Ausbilder nicht durch (AK-207). Konflikte (P2034 oder
  `TransactionWriteConflict` über den Treiber-Adapter) werden wiederholt.
- `matchLogin()` sagt nur, wer es ist; ob die Person hinein darf, entscheidet danach `decideAccess()`. Eine deaktivierte
  Person mit Konto-ID ist „bekannt“ und wird trotzdem abgewiesen.
- Das Binden ist ein bedingtes Update (`accountId: null, active: true`); ein gleichzeitiger zweiter Login liest danach
  die schon gebundene Person.
- E-Mails werden klein gespeichert (`normalizeEmail()`), auch die E-Mail aus den Claims (`extractLoginClaims()`); die
  Suche über die E-Mail ist deshalb ein Gleichheitsvergleich.
- Sitzungen sind JWT ohne Widerruf; dass eine Deaktivierung sofort wirkt, hängt allein an `getCurrentPerson()`, das bei
  jeder Anfrage die Person aus der Datenbank liest.
- Der Test-Login (`AUTH_TEST_LOGIN=true`) ist bei `NODE_ENV=production` immer aus (`testLoginEnabled()` und erneut in
  `authorize()`).
- Fremde Historie wird vor dem Löschen geprüft; zusätzlich weist die Datenbank das Löschen per Fremdschlüssel ab, und
  `deletePerson()` übersetzt den Fehler in dieselbe Meldung.
- `people.ts` importiert aus `access.ts`, `report-access.ts` und `federal-states.ts`, nie umgekehrt.

**Ersetzt durch Bordmittel:** Auf Liferay übernehmen Anmeldung über das Firmenkonto (SSO der Plattform), Sitzung,
Abmelden und die Zuordnung Konto ↔ Person die Benutzerverwaltung der Plattform (`src/auth.ts`, `src/lib/auth/`,
`extractLoginClaims()`, `matchLogin()`, Teile von `src/lib/session.ts`). Rollen werden auf Rollen der Plattform
abgebildet; die Regeln der Nutzerverwaltung (`people.ts`), die Zugriffsprüfungen (`canViewReport()`,
`canManagePeople()`) und die Zuordnung Azubi → Ausbilder bleiben Fachlogik der App. Die Einzelheiten legt das Profil
fest (G4).

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

## M05 Status und Prüfung

Fach-Spec: `specs/M05-status-und-pruefung.md` · Prüffälle: `specs/pruefung/M05.json` (Ebenen `fachlogik` und `daten`)

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/domain/report-status.ts` → `REPORT_STATUSES`, `STATUS_LABELS`, `REPORT_ACTIONS`, `ACTION_LABELS`, `TRANSITIONS` | Status, Aktionen und die sechs erlaubten Übergänge mit Rolle | M05-R01, M05-R02; AK-507, AK-607, AK-704 | nein | 1:1 übersetzen |
| `src/domain/report-status.ts` → `decideTransition()`, `TransitionDecision`, `TransitionReason`, `TRANSITION_MESSAGES`, `SeenState` | Entscheidung je Aktion: Person, Rolle, Besitz, Status und gesehener Stand, deaktivierter Azubi, Pflichttext; fester Grund und Meldung | M05-R02, M05-R03, M05-R12, M05-R14, M05-R15, M05-R19 bis M05-R21; AK-501, AK-507, AK-508, AK-602, AK-604, AK-607, AK-703, AK-704 | nein | 1:1 übersetzen |
| `src/domain/report-status.ts` → `availableActions()` | angebotene Aktionen (Schaltflächen) | M05-R04; AK-507, AK-607, AK-704 | nein | 1:1 übersetzen |
| `src/domain/report-status.ts` → `isBlank()`, `normalizeComment()`, `commentTooLong()`, `MAX_COMMENT_LENGTH` | Pflichttext, Zeilenumbrüche, 5.000 Zeichen | M05-R14, M05-R15; AK-604 | nein | 1:1 übersetzen |
| `src/domain/report-status.ts` → `reviewRoundFor()` | Prüfrunde eines neuen Statuswechsels | M05-R18; AK-702, AK-802 (M06) | nein | 1:1 übersetzen |
| `src/domain/report-status.ts` → `OPEN_STATUSES`, `isOpenStatus()` | offener Status (Definition „offen“ gehört M03, M03-R14; liegt hier, weil das Statusmodell ihn festlegt) | M03-R14, M05-R09 | nein | 1:1 übersetzen |
| `src/domain/report-submission.ts` → `validateSubmission()`, `SubmissionIssue`, `SubmissionProblem`, `SUBMISSION_PROBLEM_LABELS` | Pflichtangaben beim Einreichen, betroffene Tage in Kalenderreihenfolge | M05-R05, M05-R06; AK-501 bis AK-504 | nein | 1:1 übersetzen |
| `src/domain/report-submission.ts` → `submissionHeadline()`, `submissionSummary()`, `WEEK_OUTSIDE_TRAINING_MESSAGE` | Texte der Fehlerleiste und Meldung „ganz außerhalb“ | M05-R06, M05-R07; AK-502, AK-501 | nein | 1:1 übersetzen oder durch Meldungen der Plattform ersetzen |
| `src/domain/report-access.ts` → `canEditReport()`, `ReportForAccess` | Bearbeitbarkeit nach Status, nur eigener aktiver Azubi (M02-Teile `canViewReport()`, `canManagePeople()` siehe M02) | M05-R09; AK-505, AK-506, AK-701, AK-703, AK-704, AK-204 (M02) | nein | 1:1 übersetzen |
| `src/domain/report-access.ts` → `ReportStatus`, `reportStatusLabel()` | Typ und Anzeigename des Status | M05-R01 | nein | 1:1 übersetzen |
| `src/lib/report-transitions.ts` → `transitionReport()`, `TransitionInput`, `TransitionResult`, `TransitionFailureReason`, `TransitionEvent` | Statuswechsel in einer Transaktion: Bericht sperren (`FOR UPDATE`), entscheiden, Eingaben beim Einreichen speichern, bedingtes Update auf Status und Version, Historieneintrag, Kommentare, Outbox (M08) | M05-R05 bis M05-R08, M05-R13, M05-R14, M05-R20 bis M05-R22; AK-501 bis AK-508, AK-602 bis AK-606, AK-701 bis AK-704 | ja (Prisma, PostgreSQL) | nach Profil neu bauen |
| `src/lib/reports.ts` → `listReviewQueue()`, `ReviewScope` | Prüfliste: eingereichte Berichte, eigene oder alle, letzte Einreichung, älteste zuerst | M05-R11, M05-R12; AK-601, AK-602 | ja (Prisma) | nach Profil neu bauen |
| `src/lib/reports.ts` → `rejectionTexts()` | Gesamtkommentar bzw. Begründung der aktuellen Ablehnung für „Zu erledigen“ (Start Azubi), über `currentFeedback()` (M06) | M05-R16; AK-606 | ja (Prisma) | nach Profil neu bauen |
| `prisma/schema.prisma` → `WeeklyReport.status`, `WeeklyReport.version`; Migration `20261007090000_einreichen_pruefen` (Schreibschutz der Tage) | Status und Versionsstand; Datenbank weist Änderungen an Tagen eingereichter und freigegebener Berichte ab | M05-R09, M05-R20; AK-505, AK-704 | ja (Prisma, PostgreSQL-Trigger) | nach Profil neu bauen |

**Einstieg:** zuerst `src/domain/report-status.ts` (`TRANSITIONS`, dann `decideTransition()` von oben nach unten: die
Reihenfolge der Prüfungen ist M05-R21), dann `src/domain/report-submission.ts`, dann `transitionReport()` in
`src/lib/report-transitions.ts`. Die Oberfläche dazu (nicht in der Landkarte, M09): `src/app/(app)/berichte/[id]/actions.ts`
(Serveraktionen, schicken Status und Version des gesehenen Stands mit), `ReportView.tsx` und
`src/app/(app)/ausbilder/pruefliste/page.tsx`.

**Belege:**

- Vitest: `src/domain/report-status.test.ts` (Statusmodell als Tabelle 4 Status × 6 Aktionen × Rollen, AK-507, AK-508,
  AK-604, AK-607, AK-703, AK-704), `src/domain/report-submission.test.ts` (AK-501 bis AK-504),
  `src/domain/report-access.test.ts` (Bearbeitbarkeit), `tests/db/transitions.test.ts` (AK-501 bis AK-508, AK-601 bis
  AK-607, AK-701 bis AK-704, auch echte Gleichzeitigkeit mit `Promise.all`), `tests/db/status-change.test.ts`
  (Schreibschutz und Unveränderlichkeit, M06).
- Prüf-Runner: `tests/pruefung/fachlogik.test.ts` (Ebene `fachlogik`) und `tests/pruefung/daten.test.ts` mit
  `tests/pruefung/daten-adapter.ts` (Ebene `daten`, gegen die Test-Datenbank) führen `specs/pruefung/M05.json` aus.
- Playwright: `e2e/ak-501-803-einreichen-pruefen.spec.ts` (Einreichen, Prüfliste, Zurückziehen, AK-508 in zwei
  Browsern, Ablehnen mit Kommentaren, Rücknahme), `e2e/beispielszenarien.spec.ts` („Einreichen scheitert an fehlendem
  Text“, „Vertretung nimmt Freigabe zurück“).

**Fallen:**

- Transaktion und Version: `transitionReport()` sperrt den Bericht und schreibt den Wechsel als bedingtes Update
  (`where: { status, version }`). Scheitert es, wird mit dem aktuellen Stand neu entschieden, damit die Meldung stimmt.
  Eine Plattform ohne Versionsstand verliert AK-508.
- Beim Einreichen werden die Tageseingaben in derselben Transaktion gespeichert; scheitert danach nur die
  Pflichtprüfung, endet die Transaktion regulär (Eingaben bleiben). Ein Rollback an dieser Stelle verletzt AK-505.
- „Jetzt“ für den Zeitpunkt des Statuswechsels kommt aus `now()` (M01), nie aus `new Date()` oder einem
  Datenbank-Default; sonst lassen sich Prüffälle mit fester Uhr nicht prüfen.
- Datenbankverbindungen nur über `createPrismaClient` (fest UTC); sonst liest `@prisma/adapter-pg` die Zeitpunkte der
  Historie bei einem Server in Europe/Berlin verschoben.
- Fehlergründe stehen als `reason` an Entscheidung und Ergebnis (`TransitionReason`, `TransitionFailureReason`,
  `SaveFailureReason` in `src/lib/reports.ts`); Meldungstexte können sich ändern, die Gründe nicht ohne Änderung an
  `format.md`.
- Die Prüfrunde zählt die bisherigen Einreichungen aus der Historie (`statusChange.count`); sie wird nicht am Bericht
  gespeichert.
- Tageskommentare werden nur beim Ablehnen gelesen; beim Freigeben ignoriert der Server sie.

**Ersetzt durch Bordmittel:** Nichts fachlich: Die Regeln in `report-status.ts` und `report-submission.ts` werden 1:1
übersetzt. Transaktion, Sperre, Versionsstand und Schreibschutz baut jede Plattform mit ihren Mitteln nach; ob dabei
ein Workflow der Plattform genutzt wird, legt das Profil fest (G4).

## M08 Benachrichtigungen und Erinnerung

Fach-Spec: `specs/M08-benachrichtigungen-und-erinnerung.md` · Prüffälle: `specs/pruefung/M08.json` (Ebenen `fachlogik`
und `daten`), dazu AK-205-01 und AK-205-02 in `specs/pruefung/M02.json`

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/domain/notifications.ts` → `Channel`, `CHANNELS`, `CHANNEL_LABELS`, `DEFAULT_CHANNELS`, `parseChannels()`, `NO_CHANNEL_WARNING` | Kanäle, Voreinstellung, Auswahl aus dem Formular | M08-R04, M08-R05; AK-1011, AK-1012 | nein | 1:1 übersetzen |
| `src/domain/notifications.ts` → `Recipient`, `NotificationDraft`, `NotificationAbout`, `NotificationTopic`, `fanOut()` | eine Nachricht je gewähltem Kanal, nichts an deaktivierte Empfänger; `about` = Anlass, Azubi, Wochen (wird nicht gespeichert) | M08-R02, M08-R06, M08-R07; AK-1013, AK-1014 | nein | 1:1 übersetzen |
| `src/domain/notifications.ts` → `TransitionNotice`, `NOTICE_LABELS`, `noticeFor()`, `planTransitionNotifications()`, `TransitionNotificationInput` | Empfänger und Inhalt je Statuswechsel; Ereignisschlüssel = Historieneintrag | M08-R01, M08-R02, M08-R08; AK-1001 bis AK-1004 | nein | 1:1 übersetzen |
| `src/domain/notifications.ts` → `reportPath()`, `TRAINEE_HOME_PATH`, `traineeOverviewPath()`, `absoluteUrl()`, `shortWeek()`, `longWeek()` | Links und Wochentexte in Nachrichten | M08-R08, M08-R09; AK-1003 | nein (Pfade der App) | 1:1 übersetzen, Pfade nach Profil |
| `src/domain/notifications.ts` → `reminderWeeks()`, `planReminders()`, `ReminderTrainee`, `ReminderWeek`, `ReminderInput` | offene und überfällige Wochen zum Stichtag; Erinnerung und Information, eine pro Azubi; Ereignisschlüssel je Woche des Stichtags | M08-R19 bis M08-R22; AK-1021 bis AK-1025, AK-205 | nein | 1:1 übersetzen |
| `src/domain/notifications.ts` → `reminderSchedule()`, `ReminderSchedule` | Stichtag Montag 9:00 Uhr Berlin, Nachholen bis Dienstag 23:59 Uhr | M08-R17; AK-1021 | ja (`Intl.DateTimeFormat` mit Zeitzonen-Datenbank) | nach Profil neu bauen (Zeitzonen-API), Prüffälle AK-1021-03 bis AK-1021-12 als Maßstab |
| `src/domain/notifications.ts` → `retryDelaySeconds()` | Wartezeit nach Fehlversuchen | M08-R13; AK-1004 | nein | 1:1 übersetzen |
| `src/domain/access.ts` → `RETURN_PARAM`, `safeReturnPath()` | Rücksprungziel nach der Anmeldung (Datei sonst M02) | M08-R10; AK-1003 | nein | 1:1 übersetzen |
| `src/lib/notifications/service.ts` → `insertNotifications()`, `recordTransitionNotifications()`, `StatusChangeEvent` | Nachrichten in den Ausgangskorb, in der Transaktion des Statuswechsels (Einhängepunkt in `transitionReport()`, M05); Doppelte überspringt die Datenbank | M08-R03, M08-R07, M08-R11, M08-R12; AK-1001 bis AK-1004, AK-1014 | ja (Prisma, Unique-Index) | nach Profil neu bauen |
| `src/lib/notifications/service.ts` → `loadReminderTrainees()`, `runWeeklyReminders()`, `runDueReminders()`, `DueRemindersResult` | Erinnerungslauf: fällige Wochen anlegen (M03), höchstens einmal pro Woche (Vermerk `reminder_run` in derselben Transaktion), Stichtag Montag | M08-R17 bis M08-R22; AK-1021 bis AK-1025, AK-205 | ja (Prisma, PostgreSQL) | nach Profil neu bauen |
| `src/lib/notifications/service.ts` → `countUnread()`, `previewNotifications()`, `openNotifications()` | Glocke mit Zähler, Vorschau, Liste; Öffnen markiert als gelesen | M08-R16; AK-1015 | ja (Prisma) | nach Profil neu bauen (oder Benachrichtigungen der Plattform) |
| `src/lib/notifications/service.ts` → `updateOwnChannels()`, `ChannelsResult`, `ChannelsFailureReason` | eigene Kanäle speichern; fester Grund | M08-R04; AK-1011 | ja (Prisma) | nach Profil neu bauen |
| `src/lib/notifications/service.ts` → `countUndeliverable()`, `listUndeliverable()`, `retryUndeliverable()`, `RetryResult`, `RetryFailureReason` | nicht zustellbare Nachrichten, nur Ausbilder; „Erneut versuchen“ | M08-R15; AK-1004 | ja (Prisma) | nach Profil neu bauen |
| `src/lib/notifications/service.ts` → `listDevMailbox()` | Teams-Postfach der Demo: Azubis eigene, Ausbilder alle | Abschnitt 8 und 9 der Fach-Spec | ja (Prisma) | ersetzt durch Bordmittel (echter Teams-Kanal), nur Demo |
| `src/lib/notifications/outbox.ts` → `deliverPendingNotifications()`, `DeliveryOptions`, `DeliveryResult`, `RECIPIENT_INACTIVE` | Versandlauf: je Zeile eigene Transaktion mit `FOR NO KEY UPDATE SKIP LOCKED`, Übergabe an den Kanal, dann als zugestellt markiert; Fehlversuche mit Wartezeit, Aufgeben | M08-R11, M08-R13, M08-R14; AK-1004 | ja (PostgreSQL-Sperren, Prisma) | nach Profil neu bauen |
| `src/lib/notifications/adapters.ts` → `ChannelAdapter`, `DeliveryAdapters`, `OutgoingMessage`, `createDeliveryAdapters()` | Schnittstelle je Kanal, Auswahl per Konfiguration | Abschnitt 8 der Fach-Spec | ja | nach Profil neu bauen |
| `src/lib/notifications/adapters.ts` → `createEmailAdapter()`, `messageIdFor()` | E-Mail per SMTP (Nodemailer) mit fester Message-ID je Nachricht | M08-R11; AK-1003, AK-1004 | ja (Nodemailer, SMTP) | ersetzt durch Bordmittel (Mail-Dienst der Plattform), feste Kennung je Nachricht beibehalten |
| `src/lib/notifications/adapters.ts` → `createDevMailboxAdapter()`, `createGraphTeamsAdapter()` | Teams: Postfach der Demo bzw. Microsoft Graph (noch nicht angebunden) | Abschnitt 8 der Fach-Spec | ja (Prisma, Microsoft Graph) | ersetzt durch Bordmittel |
| `src/lib/notifications/config.ts` → `notificationConfig()`, `appBaseUrl()`, `teamsMode()`, `devMailboxEnabled()`, `NotificationConfig`, `SmtpConfig`, `GraphConfig`, `TeamsMode` | Konfiguration aus Umgebungsvariablen (`APP_URL`, `SMTP_*`, `TEAMS_MODE`, `NOTIFICATION_*`); Postfach im Produktivbetrieb nur ausdrücklich | Abschnitt 8 der Fach-Spec; AK-1003 (Basis der Links), AK-1004 | ja (Umgebungsvariablen, `NODE_ENV`) | nach Profil neu bauen |

**Einstieg:** zuerst `src/domain/notifications.ts` von oben nach unten (Kanäle, `fanOut()`, Statuswechsel, Erinnerung,
Zeitplan), dann `src/lib/notifications/service.ts` (`recordTransitionNotifications()` und `runDueReminders()`), dann
`outbox.ts` und `adapters.ts`. Außerhalb der Landkarte (plattformgebunden): `src/worker/index.ts` (Zeitplan per
pg-boss: Montag 9:00 Uhr Europe/Berlin, Nachholen beim Start und alle 10 Minuten, Versandlauf alle
`NOTIFICATION_POLL_SECONDS`), `src/worker/run-reminders.ts` (`npm run erinnerung`, Lauf von Hand mit `APP_FIXED_NOW`),
`src/proxy.ts` mit `src/lib/request-path.ts` (Rücksprungziel, Querschnitt) und die Seiten unter
`src/app/(app)/benachrichtigungen`, `einstellungen`, `ausbilder/nicht-zustellbar`, `entwickler-postfach` (M09).

**Belege:**

- Vitest: `src/domain/notifications.test.ts` (AK-1001 bis AK-1004, AK-1011 bis AK-1013, AK-1021 bis AK-1025, AK-205),
  `src/domain/access.test.ts` (AK-1003, Rücksprung), `src/lib/notifications/config.test.ts` (Teams-Postfach je
  Betrieb), `tests/db/notifications.test.ts` (Ausgangskorb, Kanäle, Glocke, genau einmal mit zwei parallelen
  Versandläufen, SMTP-Mock, nicht zustellbar), `tests/db/reminders.test.ts` (Beispielszenario, Nachholen, gleichzeitige
  Läufe).
- Prüf-Runner: `tests/pruefung/fachlogik.test.ts` (Ebene `fachlogik`) und `tests/pruefung/daten.test.ts` mit
  `tests/pruefung/daten-adapter.ts` (Ebene `daten`; Test-Kanal statt E-Mail und Teams) führen `specs/pruefung/M08.json`
  aus.
- Playwright: `e2e/ak-1001-1025-benachrichtigungen.spec.ts` (Glocke, Mailpit, Kanäle, Rücksprung),
  `e2e/beispielszenarien.spec.ts` („Erinnerung und Information an den Ausbilder“, „Vertretung nimmt Freigabe zurück“).

**Fallen:**

- „Jetzt“ nur aus `now()` (M01); der Stichtag ist Montag 9:00 Uhr in Europe/Berlin, nie in UTC oder der Zeitzone des
  Servers. Zum Nachholen plant `runDueReminders()` mit `schedule.dueAt`, legt die Nachrichten aber mit dem tatsächlichen
  Zeitpunkt an.
- Datenbankverbindungen nur über `createPrismaClient` (fest UTC); sonst liest `@prisma/adapter-pg` die Zeitpunkte
  (`created_at`, `next_attempt_at`) bei einem Server in Europe/Berlin verschoben, und Wartezeiten stimmen nicht.
- Genau einmal hängt an zwei Stellen: dem Unique-Index (Ereignis, Empfänger, Kanal) mit `skipDuplicates` beim Anlegen
  und der Zeilensperre `SKIP LOCKED` beim Versand. Wer nur eine nachbaut, verliert AK-1004.
- Der Ereignisschlüssel trägt die Art (`status-change:`, `reminder:`, `trainer-info:`) und für die Erinnerung die
  Woche des Stichtags; ein Lauf mit anderer Woche erzeugt neue Nachrichten (AK-1024), derselbe nicht.
- `NotificationDraft.about` (Anlass, Azubi, Wochen) wird nicht gespeichert; `insertNotifications()` übernimmt nur die
  Spalten der Tabelle. Der Kommentar am Feld `eventKey` in `prisma/schema.prisma` nennt noch das alte Muster
  „submitted:<statusChangeId>“; maßgeblich ist `status-change:<statusChangeId>`.
- Kommentartexte gelangen nie in eine Nachricht: `planTransitionNotifications()` bekommt sie gar nicht.
- Fehlergründe stehen als `reason` am Ergebnis (`ChannelsFailureReason`, `RetryFailureReason`); Meldungstexte können
  sich ändern.
- In Tests nie echte E-Mail oder Teams: DB-Tests nutzen einen SMTP-Mock, die Daten-Fälle einen Test-Kanal je Fall.

**Ersetzt durch Bordmittel:** Versand per E-Mail und Teams (Mail-Dienst bzw. Teams-Anbindung der Plattform), auf
Liferay ggf. die Benachrichtigungen der Plattform für den Kanal App und der Zeitplan-Dienst für den Montag. Die Regeln
in `notifications.ts` (Empfänger, Kanäle, offene und überfällige Wochen) werden 1:1 übersetzt; die Einzelheiten legt
das Profil fest (G4).

## Querschnitt

Dateien unter `src/domain/` und `src/lib/`, die keinem Fachmodul gehören oder deren Modul erst in G3 beschrieben wird.

| Datei / Funktion | Rolle | Regeln / AK | Plattformgebunden | Übertragung |
| --- | --- | --- | --- | --- |
| `src/lib/db.ts` → `createPrismaClient()`, `db()`, `DB_SESSION_OPTIONS` | einzige Stelle für Datenbankverbindungen, fest in UTC | – (Grundlage für M01-Zeitpunkte) | ja (Prisma, `@prisma/adapter-pg`) | nach Profil neu bauen (Zeitpunkte unabhängig von der Server-Zeitzone speichern) |
| `src/lib/ids.ts` → `isUuid()` | ungültige IDs aus der Adresse führen zu „nicht gefunden“ statt zu einem Datenbankfehler | – | nein | 1:1 übersetzen oder durch Plattform ersetzen |
| `src/lib/request-path.ts` → `PATH_HEADER` | aufgerufener Pfad vom Proxy (`src/proxy.ts`) an die Seiten; Grundlage für das Rücksprungziel | M08-R10; AK-1003 (M08) | ja (Next.js-Proxy, Request-Header) | ersetzt durch Bordmittel (Rücksprung der Anmeldung der Plattform) |
| `src/lib/seed-data.ts` → `seedPersons`, `accountWithoutEntry`, `accountToCreate`, `testAccounts`, `seedFederalState`, `seedReport` | Testdaten für Seed und Keycloak-Realm (Anna, Bernd, Clara, Dora, Emil) | – (Gegenstück zu `specs/pruefung/testdaten.json`) | ja (Seed, Keycloak) | nach Profil neu bauen aus `testdaten.json` |
| `src/domain/theme.ts` → `Theme`, `THEMES`, `THEME_LABELS`, `THEME_COOKIE`, `isTheme()`, `themeAttribute()`, `themeFromCookie()`, `resolveTheme()` | Darstellung Hell, Dunkel, System | M09, beschrieben in G3; UI-AK-14, UI-AK-15 | nein | 1:1 übersetzen oder durch Plattform ersetzen |
| `src/lib/theme.ts` → `themeForRequest()` | Darstellung für das erste Rendern aus Konto und Cookie | M09, beschrieben in G3; UI-AK-15 | ja (Next.js-Cookies) | nach Profil neu bauen |
| `src/domain/relative-time.ts` → `relativeTime()` | „vor 2 Std.“ in Listen | M09, beschrieben in G3 | nein | 1:1 übersetzen oder durch Formatierung der Plattform ersetzen |
| `src/domain/week-progress.ts` → `weekProgress()`, `progressLabel()`, `firstLine()` | Fortschritt einer Woche („3 von 5 Tagen ausgefüllt“) für Start Azubi | M09, beschrieben in G3; UI-AK-04 | nein | 1:1 übersetzen |

Zu M09 gehören außerdem `src/lib/people/labels.ts` und `updateOwnTheme()` in `src/lib/people/service.ts`; sie stehen
heute im Abschnitt M02 und wandern in G3 in den Abschnitt M09.
