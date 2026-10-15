# P01 Kalender und Zeit (M01)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Uhr, die ISO-Wochen, die Zeitzone Europe/Berlin, die Bundesländer und die Feiertage von M01 sind als reine Funktionen unter
`src/domain/` umgesetzt. Fertig, wenn alle Prüffälle in `specs/pruefung/M01.json` grün sind (7 AK-IDs, 50 Prüffälle der
Ebene `fachlogik`) und die Unit-Tests zu den Regeln M01-R01 bis M01-R19 grün sind. P01 baut keine Seite und keine Tabelle.

## 2. Voraussetzungen

- P00 ist abgenommen (Gerüst, Prüf-Runner mit Bau-Stand).
- M01 hängt von keinem Modul ab, wird aber **vor** P02 gebaut: P01 und P02 ändern beide `tests/pruefung/adapter.ts` und
  `tests/pruefung/cases.ts`, und P02 braucht `src/domain/clock.ts` (Profil, Abschnitt „Bitte bestätigen“, zur Parallelität).
- Profil: Abschnitte 1, 3 (Uhr) und 7 (Uhr, UTC).

## 3. Eingaben

- Fach-Spec: `specs/M01-kalender-und-zeit.md` (Regeln M01-R01 bis M01-R19, Abschnitt 5 Referenzdaten der Feiertage,
  Abschnitt 6 Schnittstellen, Abschnitt 8).
- Prüffälle: `specs/pruefung/M01.json`; Format und Schnittstellen von M01: `specs/pruefung/format.md`, „Schnittstellen von M01“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M01 Kalender und Zeit“.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und bei vorhandenem Quellcode. Lesereihenfolge: `src/domain/clock.ts` (klein, alle anderen
hängen daran), `src/domain/weeks.ts` (Wochen und Zeitzone), `src/domain/federal-states.ts`, `src/domain/holidays.ts`. Alles ist
1:1 übertragbar, außer der Feiertagsbibliothek (`feiertagejs`) und der Zeitzonen-Datenbank (`Intl.DateTimeFormat`), die auf
TypeScript ohnehin vorhanden sind. Belege: `src/domain/clock.test.ts`, `src/domain/weeks.test.ts`,
`src/domain/federal-states.test.ts`, `src/domain/holidays.test.ts`, Runner `tests/pruefung/fachlogik.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Uhr, (2) Kalendertag und ISO-Woche, (3) Wochenfunktionen, (4) Bundesländer, (5) Feiertage, (6) Adapter für
die Schnittstellen. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-404 | Gesetzliche Feiertage des eingestellten Bundeslands sind als „Feiertag“ vorbelegt; Beispiele 25.12.2026, Fronleichnam 2027 in NW ja, NI nein. Das Vorbelegen beim Anlegen regelt M03. | 3 (3 fachlogik) | `specs/pruefung/M01.json` |
| AK-1201 | „Jetzt“ aus einer zentralen Uhr, für Tests und Vorführungen stellbar, im Produktivbetrieb nicht. | 5 (5 fachlogik) | `specs/pruefung/M01.json` |
| AK-1202 | Maßgeblich ist der Kalendertag in Europe/Berlin, mit Sommer- und Winterzeit. | 9 (9 fachlogik) | `specs/pruefung/M01.json` |
| AK-1203 | ISO-8601-Kalenderwochen (Woche 1 enthält den 4. Januar). | 10 (10 fachlogik) | `specs/pruefung/M01.json` |
| AK-1204 | Eine Woche, die es nicht gibt, wird abgewiesen, z. B. KW 53/2027 oder KW 0. | 6 (6 fachlogik) | `specs/pruefung/M01.json` |
| AK-1205 | Genau die 16 Bundesländer mit festen Kürzeln; ein unbekanntes Kürzel wird abgewiesen. | 6 (6 fachlogik) | `specs/pruefung/M01.json` |
| AK-1206 | Feiertag ist jeder landesweite gesetzliche Feiertag, einschließlich einmaliger; kommunale und regionale zählen nicht. | 11 (11 fachlogik) | `specs/pruefung/M01.json` |

Hinweise zur Ablage: AK-404 (Feiertag vorbelegen, Hinweis „vorbelegt“) gehört zu M01 mit den Feiertagsregeln; das Anlegen der
Tage greift in P03, die Anzeige in P04 auf sie zu. AK-1201 bis AK-1206 sind reine Fachlogik.

## 6. Empfehlung

**Weg B.** Die Regeln sind klein und vollständig in der Fach-Spec samt Referenzdaten beschrieben; die Prüffälle sind der Maßstab.
Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p01-kalender-und-zeit`; Spec und Prüffälle lesen. Prüfschritt: Liste der Schnittstellen aus Abschnitt 6 der
   Spec notiert (`jetzt`, `uhrVorgeben`, `kalendertag`, `isoWoche`, `montagDerWoche`, `arbeitstage`, `naechsteWoche`,
   `vergleicheWochen`, `aktuelleWoche`, `bundeslaender`, `istBundesland`, `istFeiertag`, `feiertage`).
2. **Uhr `src/domain/clock.ts`** (M01-R01 bis M01-R04, AK-1201): `now()`, `setFixedNow()`, `resetClock()`, `setClock()`,
   `fixedClock()`; die gestellte Uhr liegt auf `globalThis`, damit Seiten, Route-Handler und Serveraktionen sie gleich sehen.
   `clockFromEnvironment()` liest `APP_FIXED_NOW` und gilt nur außerhalb von `NODE_ENV=production`; ein unlesbarer Zeitpunkt wirft
   `InvalidInstantError`. Prüfschritt: `src/domain/clock.test.ts` mit AK-1201-Tests (fester Zeitpunkt, Rückstellung, Produktion
   ignoriert die Vorgabe).
3. **Kalendertag und Zeitzone `src/domain/weeks.ts`** (M01-R05, M01-R06, AK-1202): `APP_TIME_ZONE` `Europe/Berlin`,
   `calendarDateIn()`, `today()`. Ein Kalendertag ist ein `Date` auf UTC-Mitternacht und wird nur mit `getUTC…()` gelesen.
   Prüfschritt: Zeitpunkte um Mitternacht, in der Sommerzeit-Umstellung und bei Jahreswechsel ergeben den richtigen Tag.
4. **ISO-Wochen** (M01-R07 bis M01-R12, AK-1202, AK-1203, AK-1204): `isoWeekOf()`, `isoWeekMonday()`, `isoWeeksInYear()`,
   `isValidIsoWeek()`, `isoWeekWorkdays()` (fünf Tage Mo–Fr), `nextIsoWeek()`, `compareWeeks()`, `currentIsoWeek()`;
   `InvalidIsoWeekError` für eine Woche, die es nicht gibt (KW 53 nur in Jahren mit 53 Wochen). Plus Texte für Oberfläche und PDF:
   `formatDate()`, `toDateInput()`, `weekLabel()`, `weekRangeLabel()`, `weekRangeShort()`, `weekdayShort()`, `weekdayLong()`,
   `isoWeekCode()` (für den Merker `data-woche`). Prüfschritt: `src/domain/weeks.test.ts` mit den Fällen KW 1 enthält den
   4. Januar, 2020/2026 mit 53 Wochen, 2027 ohne KW 53.
5. **Bundesländer `src/domain/federal-states.ts`** (M01-R13, M01-R14, AK-1205): die 16 Kürzel mit Namen, `isFederalState()`,
   `federalStateName()`, `UnknownFederalStateError`. Prüfschritt: `src/domain/federal-states.test.ts`.
6. **Feiertage `src/domain/holidays.ts`** (M01-R15 bis M01-R19, AK-404, AK-1206): `publicHolidays(bundesland, jahr)` und
   `isPublicHoliday()` über `feiertagejs`; dazu `ONE_TIME_HOLIDAYS` (einmalige landesweite Feiertage laut Referenzdaten der Spec,
   Abschnitt 5) und die Korrektur des Reformationstags vor 2018. Nur landesweite gesetzliche Feiertage, keine regionalen.
   Prüfschritt: `src/domain/holidays.test.ts`, Stichproben aus AK-404 und AK-1206 (Ostersonntag in BB, 8. März 2019 in BE).
7. **Adapter für die Fachlogik-Fälle.** In `tests/pruefung/adapter.ts`: `call(schnittstelle, eingabe)` für die 13 Schnittstellen
   von M01; Formatumwandlung (Kalendertag `JJJJ-MM-TT`, Zeitpunkt mit Offset, Woche `JJJJ-Www`); Fehler als
   `{ "fehler": "<Code>" }` (`zeitpunkt_ungueltig`, `woche_ungueltig`, `bundesland_unbekannt`). `uhrVorgeben` bildet
   `APP_FIXED_NOW` nach. Prüfschritt: `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M01.json"` ist grün.
8. **Bau-Stand.** M01 in die Liste der gebauten Module eintragen (`tests/pruefung/cases.ts`). Prüfschritt: dieselbe Zeile wie
   in Schritt 7 zeigt keine `todo` mehr für M01.
9. **Alles prüfen** (Abschnitt 8) und Abschluss (Abschnitt 9).

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M01.json"` | 50 Prüffälle grün |
| `npx vitest run --project unit src/domain/clock.test.ts src/domain/weeks.test.ts src/domain/federal-states.test.ts src/domain/holidays.test.ts` | grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P01: Kalender und Zeit (Uhr, ISO-Wochen, Feiertage)“; vor dem Push Lint, Format, Typecheck und Tests lokal grün.
- Draft-PR mit der AK-Tabelle (AK-404, AK-1201, AK-1202, AK-1203, AK-1204, AK-1205, AK-1206: Test und Prüffälle), Abweichungen
  und „Bitte bestätigen“.
- Bericht an die Steuerung per `send_message`; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Tag um eins verschoben | lokale Getter benutzt; Kalendertage nur mit `getUTC…()` lesen, in Europe/Berlin über `Intl.DateTimeFormat` bestimmen |
| `new Date()` in Fachlogik | „jetzt“ nur aus `now()` und als Parameter hineinreichen |
| KW 53 wird für 2027 akzeptiert | `isoWeeksInYear()`: Jahr hat 53 Wochen genau dann, wenn der 28. Dezember in KW 53 liegt |
| Feiertag fehlt oder zu viel (z. B. Reformationstag, einmalige Feiertage) | Referenzdaten aus Abschnitt 5 der Spec ergänzen; nur landesweite Feiertage |
| `APP_FIXED_NOW` wirkt in Produktion | nur außerhalb von `NODE_ENV=production`; Test mit Betrieb „produktiv“ (AK-1201) |
| Test nach Fall hat noch die gestellte Uhr | im Runner nach jedem Fall `resetClock()` |
