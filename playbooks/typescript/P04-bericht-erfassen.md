# P04 Bericht erfassen (M04)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Ein Azubi erfasst seine Woche: Tagesart und Tätigkeiten je Tag (Mo–Fr), Speichern als Entwurf, Zeichenzähler, Feiertags-Hinweis,
Warnung beim Verlassen mit ungespeicherten Änderungen. Fertig, wenn alle Prüffälle in `specs/pruefung/M04.json` grün sind
(7 AK-IDs; 19 Fachlogik- und 9 Ablauf-Fälle), AK-305-09 aus M03 läuft, die Datenbanktests zum Speichern grün sind und
die Browser-Tests `e2e/ak-301-408-berichte-erfassen.spec.ts` (Teil AK-401 bis AK-408) grün sind. AK-404 (Hinweis „vorbelegt“) gehört
zu M01 und ist hier in der Oberfläche belegt.

## 2. Voraussetzungen

- P00 bis P03 abgenommen (Berichte und Tage existieren, Bundesland, Zugriff).
- Profil: Abschnitte 3 (Transaktion), 4 (Ablauf-Adapter) und 7 (Merker, `use-hydrated`).

## 3. Eingaben

- Fach-Spec: `specs/M04-bericht-erfassen.md` (Regeln M04-R01 bis M04-R12, Abschnitt 5, Abschnitt 8).
- Prüffälle: `specs/pruefung/M04.json`; Funktionen und Ablauf-Aktionen: `specs/pruefung/format.md` („Schnittstellen von M04“,
  „Aufbau eines Ablauf-Falls“).
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M04 Bericht erfassen“.
- UI-Vorgaben (Referenz): `docs/05-ui-spezifikation.md`.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/report-days.ts`, `saveReportDays()` in `src/lib/reports.ts`,
`src/app/(app)/berichte/[id]/actions.ts`, `src/app/(app)/berichte/[id]/ReportEditor.tsx`,
`src/app/(app)/berichte/[id]/ReportView.tsx`, `src/components/ui/day-type.tsx`. Belege: `src/domain/report-days.test.ts`,
`tests/db/reports.test.ts`, `e2e/ak-301-408-berichte-erfassen.spec.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Regeln für Tagesarten und Texte, (2) Speichern mit Sperre, (3) Berichtsseite und Editor, (4) Merker und
Warnung beim Verlassen, (5) Ablauf-Aktionen und Adapter. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-401 | Jeder Bericht zeigt Mo–Fr mit Datum, pro Tag eine Auswahl der Tagesart und ein Freitextfeld „Tätigkeiten“. | 2 (2 fachlogik) | `specs/pruefung/M04.json` |
| AK-402 | Zur Auswahl stehen genau: Betrieb, Berufsschule, Urlaub, Krank, Feiertag. | 4 (4 fachlogik) | `specs/pruefung/M04.json` |
| AK-403 | Felder für Stunden, Abteilung oder Lernfeld gibt es nicht. | 2 (2 ablauf) | `specs/pruefung/M04.json` |
| AK-405 | Der Azubi kann eine vorbelegte Tagesart ändern, z. B. von „Feiertag“ auf „Berufsschule“. | 2 (2 fachlogik) | `specs/pruefung/M04.json` |
| AK-406 | Ein Entwurf lässt sich ausdrücklich speichern, auch unvollständig, und später unverändert weiterbearbeiten, auch nach Ab- und erneuter Anmeldung. | 3 (3 fachlogik) | `specs/pruefung/M04.json` |
| AK-407 | Umlaute, Zeilenumbrüche und lange Texte (mindestens 2.000 Zeichen) unverändert; höchstens 5.000 Zeichen je Tag mit Meldung am Feld; Zeilenumbrüche einheitlich. | 8 (8 fachlogik) | `specs/pruefung/M04.json` |
| AK-408 | Wer die Seite mit ungespeicherten Änderungen verlässt, wird gewarnt (Links, Formulare, Schließen, Neuladen, Zurück und Vor). | 7 (7 ablauf) | `specs/pruefung/M04.json` |

AK-404 (Feiertag vorbelegt) steht in M01: die Funktionen aus P01 und das Vorbelegen aus P03; der Hinweis in der Oberfläche liest
den Merker `holidayPreset`.

## 6. Empfehlung

**Weg B.** Regeln und Prüffälle sind eng, der Editor ist in der Spec und in `docs/05-ui-spezifikation.md` beschrieben. Weg A nur
auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p04-bericht-erfassen`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle im PR-Entwurf.
2. **Regeln `src/domain/report-days.ts`** (M04-R02, M04-R04, M04-R06 bis M04-R11, AK-402, AK-405, AK-406, AK-407, AK-305):
   `DAY_TYPES` (genau fünf, feste Reihenfolge), `DAY_TYPE_LABELS`, `isDayType()`; `MAX_ACTIVITIES_LENGTH` 5.000,
   `normalizeActivities()` (Zeilenumbrüche `\r\n` zu `\n`, sonst unverändert), `activitiesLength()` (Unicode-Zeichen mit
   `Array.from()`, nicht `String.length`), `activitiesError()` („um n kürzen“); `hasContent()` (mindestens ein Tag mit Tagesart
   oder Text, einmal berechnet für Ausblendung, Erinnerung und PDF); `validateDayInputs()` mit `EditableDay`, `DayInput`,
   `DayUpdate`, `DayErrors` (nicht mitgeschickt bleibt, leer erlaubt, Tage außerhalb unverändert, alle Fehler je Tag auf einmal).
   Prüfschritt: `src/domain/report-days.test.ts`.
3. **Bearbeitbarkeit.** `canEditReport()` und `ReportForAccess` in `src/domain/report-access.ts` (nur eigener aktiver Azubi, nur bei
   Status Entwurf oder Abgelehnt); P05 ergänzt die Fälle zu AK-505 und AK-704. Prüfschritt: Unit-Test für die vier Status.
4. **Speichern `saveReportDays()`** in `src/lib/reports.ts` (M04-R06, M04-R12, AK-406, AK-204): sperrt den Bericht mit
   `SELECT … FOR UPDATE` in einer Transaktion (so überfährt ein gleichzeitiger Statuswechsel aus P05 das Speichern nicht),
   prüft Rolle, Besitz und Bearbeitbarkeit, ruft `validateDayInputs()` und schreibt alle Tage oder keinen. Rückgabe mit festen
   Gründen (`SaveFailureReason`, z. B. `not-editable`, `forbidden`, `invalid`); `dayInputsFromForm()` liest die Formularfelder.
   Tage außerhalb der Ausbildung werden still übergangen. Ein Feld, das nicht im Formular steht, bleibt unverändert; ein leeres
   Feld leert die Tagesart. Prüfschritt: `tests/db/reports.test.ts` (Namen mit AK-405, AK-406, AK-407, AK-305, AK-204).
5. **Berichtsseite.** `src/app/(app)/berichte/[id]/page.tsx` (ungültige IDs führen zu „nicht gefunden“ über `src/lib/ids.ts`,
   `isUuid()`; Zugriff über `canViewReport()`), `ReportView.tsx` (lädt den Bericht, reicht den Merker „vorbelegt“ weiter),
   `ReportEditor.tsx` (Formular: je Tag Tagesart und Tätigkeiten, Zeichenzähler, Fußleiste „Gespeichert“/„Ungespeicherte
   Änderungen“, Fehlermeldungen am Feld, Sprunglink), `src/components/ui/day-type.tsx` (Auswahl der Tagesart mit „Feiertag
   (vorbelegt)“, AK-401, AK-402), `src/components/ui/autogrow.tsx`, `src/app/(app)/berichte/[id]/actions.ts` mit
   `saveReportAction()` (prüft Rolle und Besitz selbst). Genau diese Felder pro Tag: Tagesart und Tätigkeiten (AK-403). Prüfschritt:
   Browser-Test AK-401 bis AK-403 (Anzeige).
6. **Warnung beim Verlassen** (AK-408): Bei ungespeicherten Änderungen warnt die App beim Verlassen über Link, Neuladen, Zurück,
   Vor und Schließen (Rückfrage der App bzw. Dialog des Browsers); der Zustand wird an der Seite als Merker ausgegeben
   (`data-ungespeichert`, `data-warnung-verlassen`, `data-ausstehend`, `data-speicherstand`), ebenso `data-datum`, `data-fehler`,
   `data-feld`, `data-woche` (Liste in `specs/code-landkarte.md`, Abschnitt M09). Die Felder bleiben gesperrt, bis die Seite
   interaktiv ist (`src/components/ui/use-hydrated.ts`), sonst gehen frühe Eingaben verloren. Prüfschritt: Browser-Test AK-408 in
   Chromium und bei 375 px.
7. **Ablauf-Aktionen und Adapter.** In `e2e/pruefung/ablauf-adapter.ts`: `tag_erfassen`, `speichern`, `seite_verlassen` (alle
   Wege), Seiteninhalt der Seite `bericht` (`woche`, `status`, `ungespeichert`, `tage` mit den Eingabefeldern `tagesart` und
   `taetigkeiten`, `weitere_felder`); ein unbekanntes Feld liefert der Adapter als `ohne_merker`, damit AK-403 scheitert, wenn
   eines dazukommt. Die Testgrenze für AK-408-03 in Firefox steht in `e2e/pruefung/testgrenzen.ts` (Q-R06). Fachlogik-Adapter:
   `tagesarten`, `tageSpeichern`, `berichtstageAnlegen`. Prüfschritt: `-t "M04.json"` in beiden Runnern grün.
8. **Bau-Stand.** M04 eintragen und den zurückgestellten Fall AK-305-09 freigeben. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M04.json"` | 19 Fälle grün |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "AK-305-09"` | grün |
| `npx vitest run --project unit src/domain/report-days.test.ts` | grün |
| `npx vitest run --project db tests/db/reports.test.ts` | grün |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/pruefung-ablauf.spec.ts e2e/ak-301-408-berichte-erfassen.spec.ts` | Ablauf-Fälle zu M04 (AK-403-01, AK-403-02, AK-408-01 bis AK-408-07) und Tests zu AK-401 bis AK-408 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

Nur in CI: Firefox und Edge (AK-408-03 in Firefox ist die freigegebene Testgrenze).

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P04: Bericht erfassen (Editor, Speichern, Warnung beim Verlassen)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle (AK-401, AK-402, AK-403, AK-405, AK-406, AK-407, AK-408 mit Test und Prüffällen) und „Bitte bestätigen“.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Zeichenzähler weicht bei Emojis ab | Länge mit `Array.from()` zählen, nicht mit `String.length` |
| `\r\n` in der Datenbank | `normalizeActivities()` vor dem Speichern |
| Leeres Formularfeld wird übersehen | nicht mitgeschickt (`null`) bleibt, leer (`""`) leert die Tagesart |
| Frühe Eingaben gehen verloren | Felder bis zur Interaktivität sperren (`use-hydrated.ts`); Browser-Tests warten darauf |
| Hinweis „Feiertag (vorbelegt)“ stimmt nach Bundeslandwechsel nicht | `holidayPreset` aus der Datenbank lesen |
| Speichern überfährt ein gleichzeitiges Einreichen | `SELECT … FOR UPDATE` im Speichern, Status danach prüfen |
| Der Ablauf-Fall findet ein Feld nicht | feste Merker (`data-feld`, `data-woche`) nicht umbenennen; Adapter liest nie Meldungstexte |
