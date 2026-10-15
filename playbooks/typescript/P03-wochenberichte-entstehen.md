# P03 Wochenberichte entstehen (M03)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Aus Ausbildungsbeginn und -ende entstehen die Wochenberichte eines Azubis automatisch: fällige Wochen, fünf Tage Mo–Fr je Bericht,
Tage außerhalb der Ausbildung markiert, Feiertage vorbelegt, ganz ausgeblendete Wochen, Übersicht „Meine Wochen“ und Azubi-Liste
des Ausbilders. Fertig, wenn alle Prüffälle in `specs/pruefung/M03.json` grün sind (6 AK-IDs, 39 Fälle der Ebene
`fachlogik`, davon AK-305-09 zurückgestellt bis P04), die Datenbanktests zu AK-301 bis AK-306 grün sind und die Browser-Tests zu
AK-306 sowie die Zugriffsfälle AK-103 und AK-105 aus P02 laufen.

## 2. Voraussetzungen

- P00, P01 (Wochen, Feiertage, Uhr) und P02 (Personen, Zugriff, Bundesland) abgenommen.
- Profil: Abschnitte 3 (Persistenz, Hintergrundjobs) und 7 (Uhr, UTC, Kalendertage).
- M03 ist die Grundlage von M04, M05 und M08; ihre Datenbanktabelle `WeeklyReport` trägt schon `status` und `version` (M05).

## 3. Eingaben

- Fach-Spec: `specs/M03-wochenberichte-entstehen.md` (Regeln M03-R01 bis M03-R17, Abschnitt 5 Datenmodell, Abschnitt 8).
- Prüffälle: `specs/pruefung/M03.json`; Funktionen: `specs/pruefung/format.md`, „Schnittstellen von M03“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M03 Wochenberichte entstehen“.
- Abhängig von M01 (Wochen, Feiertage) und M02 (Ausbildungszeitraum, Bundesland, aktive Azubis).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/report-generation.ts` von oben nach unten (`weeksDue()`,
`planReportDays()`, `correctOutsideTraining()`, `classifyWeek()`), dann `src/lib/reports.ts` (`ensureReportsForTrainee()`,
`listTraineeWeeks()`), `src/lib/trainee-overview.ts`, die Seiten unter `src/app/(app)/azubi/` und `src/worker/index.ts`. Die
Domänenfunktionen sind 1:1 übertragbar. Belege: `src/domain/report-generation.test.ts`, `tests/db/reports.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Datenmodell mit Eindeutigkeit und Wochen-CHECK, (2) reine Funktionen für fällige Wochen, Tage und
Einordnung, (3) Anlegen in einer Transaktion, (4) Übersichten, (5) Seiten, (6) täglicher Lauf im Worker, (7) Adapter. Zu jedem
AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-301 | Für jede Woche vom Ausbildungsbeginn bis zur aktuellen Woche existiert automatisch genau ein Bericht im Status „Entwurf“; Beispiel Beginn 01.09.2026, heute 06.10.2026 → KW 36–41. | 3 (3 fachlogik) | `specs/pruefung/M03.json` |
| AK-302 | Für zukünftige Wochen gibt es keine Berichte; mit Beginn einer neuen Woche erscheint ihr Bericht automatisch. | 4 (4 fachlogik) | `specs/pruefung/M03.json` |
| AK-303 | Nach dem Ausbildungsende entstehen keine Berichte mehr. | 4 (4 fachlogik) | `specs/pruefung/M03.json` |
| AK-304 | Kein manuelles oder doppeltes Anlegen; pro Azubi und Woche immer genau ein Bericht. | 2 (2 fachlogik) | `specs/pruefung/M03.json` |
| AK-305 | Tage außerhalb der Ausbildung (Beginn oder Ende mitten in der Woche) sind ausgegraut, brauchen weder Tagesart noch Text und sind nicht änderbar. | 9 (9 fachlogik) | `specs/pruefung/M03.json` |
| AK-306 | Übersicht mit allen Wochen und Status, vergangene offene hervorgehoben; Ausbilder sehen dieselbe Liste lesend; Wochen ganz außerhalb der Ausbildung zählen nie als offen, unberührte sind ausgeblendet, andere markiert. | 17 (17 fachlogik) | `specs/pruefung/M03.json` |

## 6. Empfehlung

**Weg B.** Die Regeln sind klein und durch die Prüffälle eng geführt. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p03-wochenberichte-entstehen`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle (Abschnitt 5) im
   PR-Entwurf.
2. **Datenmodell.** In `prisma/schema.prisma`: `WeeklyReport` (`traineeId` mit `onDelete: Cascade`, `isoYear`, `isoWeek`,
   `status` Enum `DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED` mit Anfang `DRAFT`, `version` mit Anfang 0, `@@unique([traineeId,
   isoYear, isoWeek])`), `ReportDay` (`reportId` mit Kaskade, `date` als Kalendertag, `dayType` Enum
   `WORK`/`SCHOOL`/`VACATION`/`SICK`/`HOLIDAY` oder leer, `activities` Text, `outsideTraining`, `holidayPreset`,
   `@@unique([reportId, date])`). Migration von Hand ergänzen: Wochennummer 1 bis 53 und **KW 53 nur in Jahren mit 53 Wochen**
   (CHECK nach M01-R08, Name `weekly_report_iso_week_range`). Prüfschritt: Eine zweite Zeile für denselben Azubi und dieselbe Woche
   wird von der Datenbank abgewiesen (AK-304); KW 53/2027 ebenso (AK-1204 in der Datenbank).
3. **Fachfunktionen `src/domain/report-generation.ts`** (M03-R01 bis M03-R16): `weeksDue()` (von Ausbildungsbeginn bis heute,
   höchstens bis zum Ende, AK-301, AK-302, AK-303), `planReportDays()` und `PlannedDay` (fünf Tage Mo–Fr, außerhalb markiert,
   Feiertage als Tagesart `HOLIDAY` vorbelegt und mit `holidayPreset` gemerkt, AK-305, AK-404), `isOutsideTraining()`,
   `correctOutsideTraining()` (Markierung nach geändertem Ausbildungszeitraum neu berechnen, neu einbezogene Feiertage
   vorbelegen, AK-305, AK-203), `isWeekOutsideTraining()`, `classifyWeek()` (ganz außerhalb, ausgeblendet, offen, vergangen
   offen, AK-306), `isPastOpen()`. Der Begriff „offen“ (Status Entwurf oder Abgelehnt, Woche nicht ganz außerhalb) gilt für
   Übersicht, Erinnerung und PDF zugleich (M03-R14): `OPEN_STATUSES` und `isOpenStatus()` stehen in `src/domain/report-status.ts`
   (Datei von P05; lege dort in P03 nur die zwei Namen an, P05 ergänzt das Statusmodell). „Jetzt“ übergibt der Aufrufer aus
   `now()`. Prüfschritt: `src/domain/report-generation.test.ts`.
4. **Anlegen `src/lib/reports.ts`** (M03-R01 bis M03-R13, AK-301 bis AK-305, AK-203, AK-205): `ensureReportsForTrainee()` und
   `ensureReportsForAllTrainees()` legen fehlende Berichte und Tage in **einer** Transaktion an; Eindeutigkeit gibt die Datenbank
   (`createMany` mit `skipDuplicates`): zwei gleichzeitige Aufrufe erzeugen keine Doppelten. Idempotent. Für **deaktivierte Azubis entstehen keine neuen Berichte**, bestehende bleiben (M03-R06, AK-205); `ensureReportsForAllTrainees()`
   nimmt deshalb nur aktive Azubis (`listActiveTrainees()` aus P02). Vorbelegte Feiertage
   werden nie neu berechnet. Die Neuberechnung nach einer Zeitraumänderung läuft nur in offenen Berichten, auch für Wochen ganz
   außerhalb. Prüfschritt: `tests/db/reports.test.ts` (Name beginnt mit der AK-ID) für AK-301 bis AK-306, AK-203, AK-205.
5. **Übersichten.** `listTraineeWeeks()` (Wochen neueste zuerst, eingeordnet, ausgeblendete fehlen; Zugriff Azubi und Ausbilder,
   AK-306), `src/lib/trainee-overview.ts` mit `listTraineesWithProgress()` (je Azubi Wochen, freigegebene und vergangen offene
   Wochen, letzte Einreichung), `listVisibleReports()` (Sichtbarkeit nach AK-103 und AK-105). Ausgeblendet wird nur in der
   Anzeige; gelöscht wird nichts. Prüfschritt: Test „Wochen ganz außerhalb zählen nicht als offen“ (AK-306).
6. **Aufrufe einhängen.** Das Anlegen läuft beim Aufruf der Seiten von Azubi und Ausbilder, nach jeder Änderung in der
   Nutzerverwaltung (Anlegen, Ausbildungszeitraum, Bundesland, aktiv/deaktiviert, M02) und, sobald sie existieren, vor
   PDF-Export (P07) und Erinnerung (P08). Prüfschritt: Neue Person anlegen (Browser, Test-Login) erzeugt ihre Wochen sofort
   (AK-301); eine deaktivierte Person bekommt beim nächsten Lauf keine neuen Wochen (AK-205).
7. **Seiten (funktional).** `src/app/(app)/azubi/page.tsx` (Start: aktuelle Woche mit dem Merker `data-woche`, „Zu erledigen“),
   `src/app/(app)/azubi/wochen/page.tsx` mit `src/components/WeekOverview.tsx` (Meine Wochen), `src/components/ui/week-tile.tsx`,
   Ausbilder-Sicht `src/app/(app)/ausbilder/azubis/page.tsx` und `src/app/(app)/ausbilder/azubis/[id]/page.tsx` mit
   `src/components/TraineeList.tsx`. Gestaltung folgt in P09. Prüfschritt: Browser-Test `e2e/ak-301-408-berichte-erfassen.spec.ts`
   (Teil AK-301 bis AK-306).
8. **Täglicher Lauf.** `src/worker/index.ts` startet pg-boss und plant einmal täglich `ensureReportsForAllTrainees()` ein (die
   Erinnerung ergänzt P08). Der Worker liest die gleiche Datenbank, Verbindung nur über `createPrismaClient`. Prüfschritt:
   `npm run worker` startet und beendet sich bei Strg+C sauber; ein Testlauf legt fehlende Wochen an.
9. **Adapter.** In `tests/pruefung/adapter.ts`: `faelligeWochen`, `berichtstageAnlegen`, `ausserhalbNeuBerechnen`,
   `wocheEinordnen`, `istOffen`, sowie `tageSpeichern` (AK-305-09: braucht P04, zurückgestellt). Prüfschritt: `-t "M03.json"`
   grün.
10. **Bau-Stand.** M03 eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M03.json"` | 38 Fälle grün, AK-305-09 als `todo` |
| `npx vitest run --project unit src/domain/report-generation.test.ts` | grün |
| `npx vitest run --project db tests/db/reports.test.ts` | grün (AK-301 bis AK-306, AK-203, AK-205, KW 53 in der Datenbank) |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/ak-103-105-berichte.spec.ts e2e/ak-301-408-berichte-erfassen.spec.ts` | Tests zu AK-103, AK-105 und AK-301 bis AK-306 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P03: Wochenberichte entstehen (Wochenerzeugung, Übersichten)“; vor dem Push Lint, Format, Typecheck und Tests
  lokal grün.
- Draft-PR mit der AK-Tabelle (AK-301 bis AK-306 mit Test und Prüffällen), dem zurückgestellten Fall AK-305-09 und „Bitte
  bestätigen“.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Doppelte Berichte bei gleichzeitigem Aufruf | Eindeutigkeit der Datenbank nutzen (`createMany` mit `skipDuplicates`), nie erst lesen und dann schreiben |
| Hinweis „Feiertag (vorbelegt)“ ändert sich nach Bundeslandwechsel | den gespeicherten Merker `holidayPreset` lesen, nicht `isPublicHoliday()` mit dem aktuellen Bundesland |
| KW 53 in der Datenbank akzeptiert | CHECK mit der genauen Regel (28. Dezember), nicht nur 1 bis 53 |
| Woche ganz außerhalb wird gezählt oder gespeichert | `classifyWeek()` rechnet aus dem aktuellen Zeitraum; gespeichert wird dazu nichts |
| Tage um einen Tag verschoben | Kalendertage nur mit `getUTC…()`; Verbindung nur über `createPrismaClient` |
| Zeitraumänderung ändert freigegebene Berichte | Neuberechnung nur für Berichte mit offenem Status (`OPEN_STATUSES`) |
