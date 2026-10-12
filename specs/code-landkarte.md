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
