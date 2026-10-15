# P06 Historie (M06)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Statuswechsel und Kommentare eines Berichts erscheinen als Historie nach Prüfrunde (neueste zuerst) und sind technisch
unveränderlich: die Datenhaltung weist Ändern und Löschen ab, außer beim endgültigen Löschen der Person. Fertig, wenn alle
Prüffälle in `specs/pruefung/M06.json` grün sind (3 AK-IDs; 5 Fachlogik- und 8 Daten-Fälle), die Datenbanktests
(`tests/db/status-change.test.ts`, `tests/db/timezone.test.ts`) grün sind und die Browser-Tests zur Historie
(`e2e/ak-501-803-einreichen-pruefen.spec.ts`, Teil AK-801 bis AK-803) laufen. Nachweis AK-803: Profil, Abschnitt „Nachweis
AK-505 und AK-508“.

## 2. Voraussetzungen

- P00 bis P05 abgenommen (`StatusChange` und `Comment` werden seit P05 geschrieben).
- Profil: Abschnitte 3 (Historie unveränderlich), 4 (Daten-Adapter, direkte Schreibversuche) und 7 (UTC).

## 3. Eingaben

- Fach-Spec: `specs/M06-historie.md` (Regeln M06-R01 bis M06-R11, Abschnitt 5, Abschnitt 8).
- Prüffälle: `specs/pruefung/M06.json`; Aktionen der Daten-Fälle (`historie_lesen`, `historie_aendern`, `historie_loeschen`,
  `bericht_loeschen`, `person_loeschen`): `specs/pruefung/format.md`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M06 Historie“.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/report-history.ts` (`groupHistory()`, `changeLabel()`), `loadReportHistory()`
in `src/lib/reports.ts`, die Trigger per Suche in `prisma/migrations/` (`status_change_immutable`, `comment_immutable`,
`weekly_report_delete_guard`), `src/lib/history-guard.ts`, `src/components/ReportHistory.tsx`. Belege:
`src/domain/report-history.test.ts`, `tests/db/status-change.test.ts`, `tests/db/transitions.test.ts` (Block „Historie (AK-801 –
AK-803)“), `tests/db/timezone.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Trigger für Unveränderlichkeit mit festem Fehlercode, (2) Gruppierung und Bezeichnungen als reine Funktionen,
(3) Laden der Historie, (4) Anzeige, (5) Daten-Adapter für Lesen und Schreibversuche. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-801 | Jeder Bericht hat eine Historie aller Statuswechsel (Einreichen, Zurückziehen, Freigabe, Ablehnung, Rücknahme) mit Datum, Uhrzeit, Person und neuem Status. | 4 (3 fachlogik, 1 daten) | `specs/pruefung/M06.json` |
| AK-802 | Kommentare und Begründungen früherer Runden bleiben erhalten und sind ihrer Runde zugeordnet. | 4 (2 fachlogik, 2 daten) | `specs/pruefung/M06.json` |
| AK-803 | Historieneinträge kann niemand bearbeiten oder löschen; nur das endgültige Löschen der Person entfernt sie. Gilt für Statuswechsel und Kommentare; die Datenhaltung weist ihr Ändern und Löschen ab. | 5 (5 daten) | `specs/pruefung/M06.json` |

## 6. Empfehlung

**Weg B.** Die Anforderungen (Abschnitt 8 der Spec) sind eindeutig; die Trigger sind kurz. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p06-historie`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle im PR-Entwurf.
2. **Trigger** (Migration von Hand ergänzen, AK-803, M06-R08 bis M06-R10):
   - `status_change_immutable` als `BEFORE UPDATE` und `BEFORE DELETE` auf `status_change` (`status_change_no_update`,
     `status_change_no_delete`), `comment_immutable` ebenso auf `comment` (`comment_no_update`, `comment_no_delete`);
   - Ausnahme nur für DELETE als **Kaskade**: `pg_trigger_depth() > 1` und der Bericht existiert nicht mehr;
   - `weekly_report_delete_guard` (BEFORE DELETE auf `weekly_report`): weist das Löschen eines Berichts mit Historie ab, solange
     seine Person existiert;
   - jede Abweisung wirft `RAISE EXCEPTION … USING ERRCODE = 'BH803'` (fester SQLSTATE, Meldungstexte „… sind unveränderlich
     (AK-803)“).
   Prüfschritt: `UPDATE` und `DELETE` direkt in der Datenbank scheitern mit `BH803`; das Löschen der Person (Azubi) entfernt
   Berichte, Tage, Statuswechsel und Kommentare in einem Schritt; das Löschen einer Person, die in fremder Historie vorkommt
   (Ausbilder mit Statuswechseln), scheitert am Fremdschlüssel.
3. **Fehlererkennung `src/lib/history-guard.ts`**: `isHistoryImmutableError()` und `HISTORY_IMMUTABLE_SQLSTATE` erkennen die
   Abweisung am SQLSTATE `BH803`, nie am Text. `@prisma/adapter-pg` liefert den Code unter
   `meta.driverAdapterError.cause.originalCode`. Prüfschritt: `tests/db/status-change.test.ts`, „AK-803 Abweisungen der Historie
   tragen den festen Code, unabhängig vom Meldungstext“.
4. **Fachfunktionen `src/domain/report-history.ts`** (M06-R01 bis M06-R07, AK-801, AK-802): `HistoryChange`, `HistoryComment`,
   `HistoryRound`, `groupHistory()` (nach Prüfrunde, neueste zuerst; Statuswechsel nach `seq`, Tageskommentare Mo–Fr),
   `changeLabel()` („Erneut eingereicht“, „Freigabe zurückgenommen“ …), `formatDateTime()` (Berliner Zeit, „07.10.2026, 14:05 Uhr“,
   AK-801), `currentFeedback()` (Rückmeldung der letzten Ablehnung bzw. Rücknahme, AK-606, AK-703), `currentApproval()` (aktuell
   gültige Freigabe für Berichtsseite und Freigabevermerk in P07, AK-603, AK-905). Prüfschritt: `src/domain/report-history.test.ts`.
5. **Laden `loadReportHistory()`** in `src/lib/reports.ts` (AK-801, AK-802): Statuswechsel nach `seq`, Kommentare nach Runde und
   Zeitpunkt, mit Namen (`actorName`, `authorName`), nicht mit Personen-IDs. `rejectionTexts()` aus P05 nutzt jetzt
   `currentFeedback()`; `hasForeignHistory()` in `src/lib/people/service.ts` fragt die Historie wirklich ab (AK-206). Prüfschritt:
   `tests/db/transitions.test.ts`, Block „Historie (AK-801 – AK-803)“.
6. **Anzeige** `src/components/ReportHistory.tsx`, eingebunden in `ReportView.tsx`: je Prüfrunde Statuswechsel und Kommentare,
   mit den festen Merkern `data-von`, `data-nach`, `data-person`, `data-zeitpunkt`. Prüfschritt: Browser-Test AK-801 bis AK-803 in
   `e2e/ak-501-803-einreichen-pruefen.spec.ts`.
7. **Zeitpunkte unabhängig von der Serverzeit.** `tests/db/timezone.test.ts`: Der Test läuft mit `TZ=Europe/Berlin` und prüft, dass
   gespeicherte Zeitpunkte (auch aus Roh-SQL) in Berliner Zeit richtig angezeigt werden. Prüfschritt: Test grün.
8. **Daten-Adapter erweitern.** `historie_lesen`; die Schreibversuche `historie_aendern`, `historie_loeschen`, `bericht_loeschen`
   gehen **direkt über den Prisma-Client** (damit die Trigger geprüft werden, nicht die Fachlogik), `person_loeschen`; eine
   Abweisung wird als `{ "fehler": "historie_unveraenderlich" }` gemeldet, erkannt am SQLSTATE. Fachlogik-Adapter:
   `historieGruppieren`. Prüfschritt: `-t "M06.json"` in beiden Runnern grün. Das Zurücksetzen der Test-Datenbank bleibt
   `resetDatabase`, das über das Löschen der Personen kaskadiert (anders sind die Daten nicht löschbar).
9. **Bau-Stand.** M06 eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M06.json"` | 5 Fälle grün |
| `npx vitest run --project db tests/pruefung/daten.test.ts -t "M06.json"` | 8 Fälle grün |
| `npx vitest run --project unit src/domain/report-history.test.ts` | grün |
| `npx vitest run --project db tests/db/status-change.test.ts tests/db/timezone.test.ts tests/db/transitions.test.ts` | grün |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/ak-501-803-einreichen-pruefen.spec.ts` | Tests zu AK-801 bis AK-803 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „P06: Historie (unveränderlich, nach Prüfrunde)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle (AK-801, AK-802, AK-803 mit Test und Prüffällen), dem Nachweis AK-803 (Verweis auf das Profil) und
  „Bitte bestätigen“.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Testdaten lassen sich nicht löschen | erwartet: Trigger; nur über das Löschen der Personen zurücksetzen (`resetDatabase`) |
| Löschen einer Person scheitert unerwartet | die Kaskade greift nur, wenn der Bericht schon nicht mehr existiert (`pg_trigger_depth() > 1`); Fremdschlüssel auf Autoren beachten |
| Fehler wird am Meldungstext erkannt | SQLSTATE `BH803` lesen; unter `meta.driverAdapterError.cause.originalCode` |
| Reihenfolge bei gleichem Zeitpunkt falsch | Statuswechsel tragen `seq`; Kommentare nach Runde und Zeitpunkt sortieren |
| Zeiten in der Historie verschoben | Verbindung nur über `createPrismaClient` (UTC), Anzeige mit Europe/Berlin |
| Prüfrunde nachträglich berechnet | sie wird beim Schreiben bestimmt (`reviewRoundFor()`), nie nachträglich |
