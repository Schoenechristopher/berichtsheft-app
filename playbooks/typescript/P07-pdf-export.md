# P07 PDF-Export (M07)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Wochenberichte lassen sich als PDF exportieren: eine Woche oder ein Zeitraum, je Woche eine Seite, mit Freigabevermerk bei
freigegebenen Wochen und der Kennzeichnung „Nicht freigegeben – Status: …“ sonst; Zugriff wie bei der Berichtsseite. Fertig,
wenn alle Prüffälle in `specs/pruefung/M07.json` grün sind (7 AK-IDs; 24 Fachlogik- und 5 Daten-Fälle), die Tests von
`src/pdf/report-pdf.test.ts` (PDF erzeugen und Text auslesen) und `tests/db/pdf-export.test.ts` grün sind und die Browser-Tests
`e2e/ak-901-907-pdf-export.spec.ts` laufen.

## 2. Voraussetzungen

- P00 bis P06 abgenommen (Zugriff aus M02, Wochen aus M03, Status aus M05, `currentApproval()` aus M06).
- Profil: Abschnitte 1 (PDF, Schrift), 3 (PDF) und 7 (Uhr). Die Schrift Noto Sans liegt in `assets/fonts/` (Lizenz
  `assets/fonts/OFL.txt`); sie muss eingebettet werden, damit Umlaute stimmen.

## 3. Eingaben

- Fach-Spec: `specs/M07-pdf-export.md` (Regeln M07-R01 bis M07-R14, Abschnitt 5, Abschnitt 6 Schnittstellen, Abschnitt 8).
- Prüffälle: `specs/pruefung/M07.json`; Schnittstellen `pdfWoche`, `pdfZeitraum` und Daten-Aktionen `pdf_woche_exportieren`,
  `pdf_zeitraum_exportieren`: `specs/pruefung/format.md`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M07 PDF-Export“.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/report-pdf.ts` (`pdfMarking()`, `toPdfWeek()`, `weekExport()`,
`rangeExport()`), `src/lib/report-export.ts`, `src/pdf/ReportPdf.tsx`, `src/pdf/fonts.ts`, `src/pdf/render.tsx`,
`src/pdf/response.ts`, die Routen `src/app/(app)/berichte/[id]/pdf/route.ts` und `src/app/(app)/azubis/[id]/pdf/route.ts`. Belege:
`src/domain/report-pdf.test.ts`, `src/pdf/report-pdf.test.ts`, `src/pdf/beispiel-pdf.test.ts`, `tests/db/pdf-export.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Inhalt eines PDF als reine Funktionen (`PdfDocument`), (2) Laden und Zugriff, (3) Layout mit der PDF-Bibliothek,
(4) Routen, (5) Bedienelemente, (6) Adapter. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-901 | Eine Woche lässt sich als PDF exportieren, mit Name, Kalenderwoche, Zeitraum, allen Tagen mit Datum, Tagesart und Tätigkeiten sowie dem Status; exportiert wird der zuletzt gespeicherte Stand. | 2 (2 fachlogik) | `specs/pruefung/M07.json` |
| AK-902 | Für einen Zeitraum entsteht ein Sammel-PDF aller Wochen in zeitlicher Reihenfolge; jede Woche beginnt auf einer neuen Seite. | 13 (12 fachlogik, 1 daten) | `specs/pruefung/M07.json` |
| AK-903 | Freigegebene Wochen tragen einen Freigabevermerk mit Name des Ausbilders, Datum und Uhrzeit der aktuell gültigen Freigabe. | 4 (3 fachlogik, 1 daten) | `specs/pruefung/M07.json` |
| AK-904 | Nicht freigegebene Wochen sind deutlich gekennzeichnet, z. B. „Nicht freigegeben – Status: Entwurf“. | 2 (2 fachlogik) | `specs/pruefung/M07.json` |
| AK-905 | Nach einer Rücknahme enthält ein neu erzeugtes PDF keinen Freigabevermerk mehr. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M07.json` |
| AK-906 | Der Azubi exportiert nur eigene Berichte, ein Ausbilder die aller Azubis, auch deaktivierter; fremd „Zugriff verweigert“, unbekannt „Seite nicht gefunden“. | 2 (2 daten) | `specs/pruefung/M07.json` |
| AK-907 | Umlaute und lange Texte erscheinen im PDF vollständig, nichts wird abgeschnitten; keine Silbentrennung, nur Wörter über 24 Zeichen werden umbrochen. | 4 (4 fachlogik) | `specs/pruefung/M07.json` |

## 6. Empfehlung

**Weg B.** Der Inhalt ist in der Spec und den Prüffällen genau festgelegt; das Layout ist frei, solange die Inhalte stimmen. Weg A
nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p07-pdf-export`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle im PR-Entwurf.
2. **Inhalt `src/domain/report-pdf.ts`** (M07-R01 bis M07-R13, AK-901 bis AK-905, AK-907): `pdfMarking()` (Freigabevermerk der
   **aktuell gültigen** Freigabe aus `currentApproval()` „Freigegeben von <Name> am <Datum>, <Uhrzeit> Uhr“, nur bei Status
   Freigegeben; sonst die Kennzeichnung „Nicht freigegeben – Status: <Status>“; Kurzform für die Kopfzeile), `toPdfWeek()` und
   `pdfDayTypeLabel()` (Name, KW, Zeitraum, Tage mit Datum, Tagesart, Tätigkeiten, Status, „ganz außerhalb“), `isWeekInRange()`,
   `selectExportWeeks()`, `withExportFlags()` (Wochen, die den Zeitraum berühren, ohne ausgeblendete Wochen nach `classifyWeek()`,
   zeitlich sortiert, AK-902), `exportRange()`, `parseExportRange()`, `defaultExportRange()`, `parseDateInput()` mit festen Gründen
   (`RangeReason`) bei ungültiger Eingabe, `weekExport()`, `rangeExport()`, `weekPdfDocument()`, `rangePdfDocument()`
   (Titel, Erstellungszeitpunkt, Wochen, Dateiname), `fileNamePart()`, `weekPdfFileName()`, `rangePdfFileName()` (umschriebener
   Name, AK-901, AK-907). Der Erstellungszeitpunkt und „heute“ kommen aus `now()` und werden hineingereicht. Prüfschritt:
   `src/domain/report-pdf.test.ts`.
3. **Laden und Zugriff `src/lib/report-export.ts`** (M07-R03, M07-R14, AK-901, AK-902, AK-905, AK-906): `loadWeekExport()`,
   `loadRangeExport()`, `exportRangeDefaults()` mit `ExportResult` und festen Gründen; Zugriff wie die Berichtsseite
   (`canViewReport()`), fehlende Wochen vorher anlegen (P03); den Zeitraum prüfen, **bevor** `ensureReportsForTrainee()` läuft,
   damit ein abgewiesener Zeitraum keine Wochen anlegt. Prüfschritt: `tests/db/pdf-export.test.ts` (Zugriff, Vermerk nach Freigabe
   und Rücknahme, Sammel-PDF).
4. **Layout `src/pdf/`** mit `@react-pdf/renderer`: `ReportPdf.tsx` (je Woche eine `Page`, Kopf- und Fußzeile `fixed`, Umbruch
   überlanger Wörter, Fußzeile mit Seitenzahl und Erstellungszeitpunkt), `fonts.ts` (Noto Sans Regular und Bold aus
   `assets/fonts/`, eingebettet), `render.tsx` (Daten rein, PDF-Bytes raus), `response.ts` (HTTP-Antwort mit
   `Content-Type: application/pdf`, `Content-Disposition` mit Dateiname, `Cache-Control: no-store`). Texte, die nur im Layout
   stehen („Freigabevermerk“ als Überschrift, „Keine Tätigkeiten eingetragen.“), erfassen die Prüffälle nicht; sie gehören ins
   Layout. Prüfschritt: `src/pdf/report-pdf.test.ts` erzeugt ein PDF und liest den Text mit `pdfjs-dist` aus
   (`tests/pdf-text.ts`): Inhalt, eine Seite je Woche, Kopf und Fuß, Umlaute, 5.000 Zeichen, überlange Wörter, Laufzeit bei 150
   Wochen.
5. **Routen.** `src/app/(app)/berichte/[id]/pdf/route.ts` (`GET`, eine Woche) und `src/app/(app)/azubis/[id]/pdf/route.ts` (`GET`, Zeitraum
   über `von` und `bis`); Zugriffsprüfung bei **jedem** Aufruf; Antwort mit festem Grund und Status: unbekannter Bericht 404
   (`NOT_FOUND_MESSAGE`), fremder Bericht 403, ungültiger Zeitraum 400. Prüfschritt: Browser-Test `e2e/ak-901-907-pdf-export.spec.ts` (Download, Zugriff).
6. **Bedienelemente.** `src/components/PdfExport.tsx` (Link „PDF“ je Woche, Dialog für das Sammel-PDF mit Vorbelegung); vor dem
   Download warnt die Berichtsseite bei ungespeicherten Änderungen (AK-408, P04). Prüfschritt: Test mit ungespeicherten
   Änderungen in `e2e/ak-301-408-berichte-erfassen.spec.ts`.
7. **Adapter.** Fachlogik: `pdfWoche`, `pdfZeitraum`; Daten: `pdf_woche_exportieren`, `pdf_zeitraum_exportieren` (liefern den
   Inhalt `PdfDocument`, nicht die Bytes). Prüfschritt: `-t "M07.json"` in beiden Runnern grün.
8. **Beispiel-PDFs.** `src/pdf/beispiel-pdf.test.ts` und das Skript `pdf:beispiel` erzeugen Beispiele aus den Seed-Daten (die CI
   lädt sie als Artefakt hoch; nur Testdaten). Prüfschritt: `npm run pdf:beispiel` läuft.
9. **Bau-Stand.** M07 eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M07.json"` | 24 Fälle grün |
| `npx vitest run --project db tests/pruefung/daten.test.ts -t "M07.json"` | 5 Fälle grün |
| `npx vitest run --project unit src/domain/report-pdf.test.ts src/pdf/report-pdf.test.ts` | grün |
| `npx vitest run --project db tests/db/pdf-export.test.ts` | grün |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/ak-901-907-pdf-export.spec.ts` | Tests zu AK-901 bis AK-907 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P07: PDF-Export (Einzel- und Sammel-PDF, Freigabevermerk)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle (AK-901 bis AK-907 mit Test und Prüffällen) und „Bitte bestätigen“. `src/pdf/**` löst in der CI die volle
  Prüfung aus (Änderungsklasse L, `docs/ci-richtlinie.md`).
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Umlaute fehlen oder Kästchen | Noto Sans einbetten (`src/pdf/fonts.ts`); die Standardschriften des PDF-Formats genügen nicht |
| Freigabevermerk bei zurückgenommener Freigabe | `currentApproval()` nutzt nur den Stand „Freigegeben“; sonst Kennzeichnung |
| `new Date()` im Export | Erstellungszeitpunkt und „heute“ aus `now()` hineinreichen |
| Abgewiesener Zeitraum legt Wochen an | Zeitraum zuerst prüfen, dann `ensureReportsForTrainee()` |
| Überlanges Wort sprengt die Seite | Umbruch überlanger Wörter im Layout |
| PDF wird zwischengespeichert | Antwort mit `Cache-Control: no-store` |
| PDF-Text im Test nicht lesbar | `pdfjs-dist` im Test (Hilfe `tests/pdf-text.ts`), nicht den Roh-Stream durchsuchen |
